// Notification Types

export type NotificationType =
  | 'job_assigned'
  | 'job_started'
  | 'job_submitted'
  | 'job_completed'
  | 'job_revision'
  | 'new_message'
  | 'payment_received'
  | 'worker_flagged'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: {
    jobId?: string;
    jobTitle?: string;
    senderId?: string;
    senderName?: string;
    amount?: number;
    [key: string]: unknown;
  };
  read: boolean;
  createdAt: Date;
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: Notification['data'];
}

export interface SSEMessage {
  event: 'notification' | 'ping' | 'connected';
  data: Notification | { timestamp: number } | { userId: string };
}

// Notification templates
export const NOTIFICATION_TEMPLATES: Record<NotificationType, { title: string; message: string }> = {
  job_assigned: {
    title: 'New Job Assigned',
    message: 'You have been assigned to "{jobTitle}"',
  },
  job_started: {
    title: 'Work Started',
    message: 'Work has begun on "{jobTitle}"',
  },
  job_submitted: {
    title: 'Job Submitted for Review',
    message: '"{jobTitle}" is ready for your review',
  },
  job_completed: {
    title: 'Job Completed',
    message: '"{jobTitle}" has been approved and completed',
  },
  job_revision: {
    title: 'Revision Requested',
    message: 'Revision requested for "{jobTitle}"',
  },
  new_message: {
    title: 'New Message',
    message: '{senderName} sent a message on "{jobTitle}"',
  },
  payment_received: {
    title: 'Payment Received',
    message: 'You received ${amount} for "{jobTitle}"',
  },
  worker_flagged: {
    title: 'Job Flagged',
    message: 'Worker flagged "{jobTitle}" for review',
  },
  system: {
    title: 'System Notification',
    message: '{message}',
  },
};

/**
 * Format notification message with data placeholders
 */
export function formatNotificationMessage(
  template: string,
  data: Notification['data']
): string {
  if (!data) return template;

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = data[key];
    if (value === undefined) return match;
    return String(value);
  });
}
