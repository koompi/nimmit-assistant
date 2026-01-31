// Notification Store - In-memory for development, use Redis in production
import { v4 as uuidv4 } from 'uuid';
import {
  Notification,
  NotificationPayload,
  NotificationType,
  NOTIFICATION_TEMPLATES,
  formatNotificationMessage,
} from './types';

// In-memory stores
const notifications: Map<string, Notification[]> = new Map();
const subscribers: Map<string, Set<(notification: Notification) => void>> = new Map();

// Max notifications per user
const MAX_NOTIFICATIONS = 100;

/**
 * Create and store a notification
 */
export function createNotification(
  userId: string,
  payload: NotificationPayload
): Notification {
  const template = NOTIFICATION_TEMPLATES[payload.type];
  const title = payload.title || formatNotificationMessage(template.title, payload.data);
  const message = payload.message || formatNotificationMessage(template.message, payload.data);

  const notification: Notification = {
    id: uuidv4(),
    userId,
    type: payload.type,
    title,
    message,
    data: payload.data,
    read: false,
    createdAt: new Date(),
  };

  // Store notification
  const userNotifications = notifications.get(userId) || [];
  userNotifications.unshift(notification);

  // Trim to max size
  if (userNotifications.length > MAX_NOTIFICATIONS) {
    userNotifications.splice(MAX_NOTIFICATIONS);
  }

  notifications.set(userId, userNotifications);

  // Notify subscribers
  const userSubscribers = subscribers.get(userId);
  if (userSubscribers) {
    userSubscribers.forEach((callback) => callback(notification));
  }

  return notification;
}

/**
 * Get notifications for a user
 */
export function getNotifications(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {}
): Notification[] {
  const { unreadOnly = false, limit = 50 } = options;
  let userNotifications = notifications.get(userId) || [];

  if (unreadOnly) {
    userNotifications = userNotifications.filter((n) => !n.read);
  }

  return userNotifications.slice(0, limit);
}

/**
 * Get unread count for a user
 */
export function getUnreadCount(userId: string): number {
  const userNotifications = notifications.get(userId) || [];
  return userNotifications.filter((n) => !n.read).length;
}

/**
 * Mark notification as read
 */
export function markAsRead(userId: string, notificationId: string): boolean {
  const userNotifications = notifications.get(userId);
  if (!userNotifications) return false;

  const notification = userNotifications.find((n) => n.id === notificationId);
  if (!notification) return false;

  notification.read = true;
  return true;
}

/**
 * Mark all notifications as read for a user
 */
export function markAllAsRead(userId: string): number {
  const userNotifications = notifications.get(userId);
  if (!userNotifications) return 0;

  let count = 0;
  userNotifications.forEach((n) => {
    if (!n.read) {
      n.read = true;
      count++;
    }
  });

  return count;
}

/**
 * Subscribe to real-time notifications
 */
export function subscribe(
  userId: string,
  callback: (notification: Notification) => void
): () => void {
  let userSubscribers = subscribers.get(userId);
  if (!userSubscribers) {
    userSubscribers = new Set();
    subscribers.set(userId, userSubscribers);
  }

  userSubscribers.add(callback);

  // Return unsubscribe function
  return () => {
    userSubscribers?.delete(callback);
    if (userSubscribers?.size === 0) {
      subscribers.delete(userId);
    }
  };
}

/**
 * Send notification to a user (convenience function)
 */
export function notify(
  userId: string,
  type: NotificationType,
  data?: Notification['data']
): Notification {
  return createNotification(userId, { type, title: '', message: '', data });
}

/**
 * Send notification to multiple users
 */
export function notifyMany(
  userIds: string[],
  type: NotificationType,
  data?: Notification['data']
): Notification[] {
  return userIds.map((userId) => notify(userId, type, data));
}

/**
 * Clear all notifications for a user (for testing)
 */
export function clearNotifications(userId: string): void {
  notifications.delete(userId);
}
