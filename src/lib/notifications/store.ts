
// Notification Store - MongoDB implementation
import {
  Notification as NotificationType,
  NotificationPayload,
  NotificationType as EnumNotificationType,
  NOTIFICATION_TEMPLATES,
  formatNotificationMessage,
} from './types';
import { Notification as NotificationModel, INotification } from '@/lib/db/models';
import dbConnect from '@/lib/db/connection';

// Helper to convert Mongoose doc to Notification interface
const toNotification = (doc: INotification): NotificationType => ({
  id: doc._id.toString(),
  userId: doc.userId,
  type: doc.type as EnumNotificationType,
  title: doc.title,
  message: doc.message,
  data: doc.data as NotificationType['data'],
  read: doc.read,
  createdAt: doc.createdAt,
});


/**
 * Create and store a notification
 */
export async function createNotification(
  userId: string,
  payload: NotificationPayload
): Promise<NotificationType> {
  await dbConnect();

  const template = NOTIFICATION_TEMPLATES[payload.type];
  const title = payload.title || formatNotificationMessage(template.title, payload.data);
  const message = payload.message || formatNotificationMessage(template.message, payload.data);

  const doc = await NotificationModel.create({
    userId,
    type: payload.type,
    title,
    message,
    data: payload.data,
    read: false,
    createdAt: new Date(),
  }) as INotification;

  return toNotification(doc);
}

/**
 * Get notifications for a user
 */
export async function getNotifications(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {}
): Promise<NotificationType[]> {
  await dbConnect();
  const { unreadOnly = false, limit = 50 } = options;

  const query: any = { userId };
  if (unreadOnly) {
    query.read = false;
  }

  const docs = await NotificationModel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit) as INotification[];

  return docs.map(toNotification);
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  await dbConnect();
  return NotificationModel.countDocuments({ userId, read: false });
}

/**
 * Mark notification as read
 */
export async function markAsRead(userId: string, notificationId: string): Promise<boolean> {
  await dbConnect();
  const result = await NotificationModel.updateOne(
    { _id: notificationId, userId },
    { $set: { read: true } }
  );
  return result.modifiedCount > 0;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
  await dbConnect();
  const result = await NotificationModel.updateMany(
    { userId, read: false },
    { $set: { read: true } }
  );
  return result.modifiedCount;
}

/**
 * Send notification to a user (convenience function)
 */
export async function notify(
  userId: string,
  type: EnumNotificationType,
  data?: NotificationType['data']
): Promise<NotificationType> {
  return createNotification(userId, { type, title: '', message: '', data });
}

/**
 * Send notification to multiple users
 */
export async function notifyMany(
  userIds: string[],
  type: EnumNotificationType,
  data?: NotificationType['data']
): Promise<NotificationType[]> {
  return Promise.all(userIds.map((userId) => notify(userId, type, data)));
}

/**
 * Clear all notifications for a user (for testing)
 */
export async function clearNotifications(userId: string): Promise<void> {
  await dbConnect();
  await NotificationModel.deleteMany({ userId });
}
