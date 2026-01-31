// Server-Sent Events (SSE) endpoint for real-time notifications
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { subscribe, getUnreadCount } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/notifications/stream
 * SSE endpoint for real-time notifications
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Helper to send SSE message
      const sendEvent = (event: string, data: unknown) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Send initial connection event with unread count
      sendEvent('connected', {
        userId,
        unreadCount: getUnreadCount(userId),
        timestamp: Date.now(),
      });

      // Subscribe to notifications
      const unsubscribe = subscribe(userId, (notification) => {
        sendEvent('notification', notification);
      });

      // Keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          sendEvent('ping', { timestamp: Date.now() });
        } catch {
          // Stream closed
          clearInterval(pingInterval);
        }
      }, 30000);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        clearInterval(pingInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
