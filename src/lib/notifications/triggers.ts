// Notification Triggers - Called from API routes when events occur
import { notify, notifyMany } from './store';
import type { NotificationType } from './types';

/**
 * Notify when a job is assigned to a worker
 */
export function notifyJobAssigned(
  workerId: string,
  jobId: string,
  jobTitle: string
) {
  return notify(workerId, 'job_assigned', { jobId, jobTitle });
}

/**
 * Notify client when worker starts their job
 */
export function notifyJobStarted(
  clientId: string,
  jobId: string,
  jobTitle: string
) {
  return notify(clientId, 'job_started', { jobId, jobTitle });
}

/**
 * Notify client when job is submitted for review
 */
export function notifyJobSubmitted(
  clientId: string,
  jobId: string,
  jobTitle: string
) {
  return notify(clientId, 'job_submitted', { jobId, jobTitle });
}

/**
 * Notify worker when job is completed/approved
 */
export function notifyJobCompleted(
  workerId: string,
  jobId: string,
  jobTitle: string
) {
  return notify(workerId, 'job_completed', { jobId, jobTitle });
}

/**
 * Notify worker when revision is requested
 */
export function notifyRevisionRequested(
  workerId: string,
  jobId: string,
  jobTitle: string
) {
  return notify(workerId, 'job_revision', { jobId, jobTitle });
}

/**
 * Notify recipient of new message
 */
export function notifyNewMessage(
  recipientId: string,
  senderId: string,
  senderName: string,
  jobId: string,
  jobTitle: string
) {
  return notify(recipientId, 'new_message', {
    jobId,
    jobTitle,
    senderId,
    senderName,
  });
}

/**
 * Notify worker of payment
 */
export function notifyPaymentReceived(
  workerId: string,
  amount: number,
  jobId: string,
  jobTitle: string
) {
  return notify(workerId, 'payment_received', {
    jobId,
    jobTitle,
    amount,
  });
}

/**
 * Notify admin when worker flags a job
 */
export function notifyWorkerFlagged(
  adminIds: string[],
  jobId: string,
  jobTitle: string,
  workerName: string
) {
  return notifyMany(adminIds, 'worker_flagged', {
    jobId,
    jobTitle,
    senderName: workerName,
  });
}

/**
 * Send system notification to user(s)
 */
export function notifySystem(
  userIds: string | string[],
  message: string,
  data?: Record<string, unknown>
) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  return notifyMany(ids, 'system', { ...data, message });
}
