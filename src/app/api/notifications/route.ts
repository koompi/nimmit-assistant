// Notifications API
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/lib/notifications';

/**
 * GET /api/notifications
 * Get notifications for the current user
 *
 * Query params:
 * - unreadOnly: boolean - Only return unread notifications
 * - limit: number - Max notifications to return (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const notifications = await getNotifications(session.user.id, { unreadOnly, limit });
    const unreadCount = await getUnreadCount(session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        total: notifications.length,
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get notifications',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read
 *
 * Body:
 * - notificationId: string - Mark specific notification as read
 * - markAll: boolean - Mark all notifications as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      const count = await markAllAsRead(session.user.id);
      return NextResponse.json({
        success: true,
        data: { markedCount: count },
        message: `Marked ${count} notifications as read`,
      });
    }

    if (notificationId) {
      const success = await markAsRead(session.user.id, notificationId);
      if (!success) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Notification marked as read',
      });
    }

    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing notificationId or markAll' } },
      { status: 400 }
    );
  } catch (error) {
    console.error('Mark notification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to mark notification',
        },
      },
      { status: 500 }
    );
  }
}
