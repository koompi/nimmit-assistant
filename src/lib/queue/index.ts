import { Queue } from "bullmq";
import { connection, close } from "./connection";
import type {
  JobAnalysisJobData,
  AutoAssignJobData,
  NotificationJobData,
  WebhookJobData,
} from "./types";
import { DEFAULT_QUEUE_CONFIG } from "./types";

// ===========================================
// Queue Initialization
// ===========================================

const config = {
  ...DEFAULT_QUEUE_CONFIG,
  connection,
};

export const queues = {
  jobAnalysis: new Queue<JobAnalysisJobData>("job-analysis", config),
  autoAssign: new Queue<AutoAssignJobData>("auto-assign", config),
  notifications: new Queue<NotificationJobData>("notifications", config),
  webhookEvents: new Queue<WebhookJobData>("webhook-events", config),
};

// ===========================================
// Helper Functions to Add Jobs
// ===========================================

/**
 * Add a job analysis job to the queue
 */
export async function addJobAnalysisJob(data: JobAnalysisJobData) {
  const job = await queues.jobAnalysis.add("analyze-job", data, {
    priority: 10, // High priority for job analysis
  });
  return job;
}

/**
 * Add an auto-assignment job to the queue
 */
export async function addAutoAssignJob(data: AutoAssignJobData) {
  const job = await queues.autoAssign.add("auto-assign", data, {
    priority: 8, // Medium-high priority
  });
  return job;
}

/**
 * Add a notification job to the queue
 */
export async function addNotificationJob(data: NotificationJobData) {
  const job = await queues.notifications.add("send-notification", data, {
    priority: 5, // Normal priority
  });
  return job;
}

/**
 * Add a webhook event job to the queue
 */
export async function addWebhookJob(data: WebhookJobData) {
  const job = await queues.webhookEvents.add("process-webhook", data, {
    priority: 7, // Medium-high priority
  });
  return job;
}

// ===========================================
// Queue Management Functions
// ===========================================

/**
 * Get queue statistics
 */
export async function getQueueStats(queueName: keyof typeof queues) {
  const queue = queues[queueName];
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Get all queue statistics
 */
export async function getAllQueueStats() {
  const stats = await Promise.all(
    Object.keys(queues).map(async (name) => ({
      name,
      ...(await getQueueStats(name as keyof typeof queues)),
    }))
  );
  return stats;
}

/**
 * Clean up queues (remove old jobs)
 */
export async function cleanQueues() {
  await Promise.all(
    Object.values(queues).map(async (queue) => {
      await queue.clean(24 * 60 * 60 * 1000, 1000); // Clean jobs older than 24 hours
    })
  );
}

/**
 * Close all queues
 */
export async function closeQueues() {
  await Promise.all(Object.values(queues).map((queue) => queue.close()));
  await close();
}

// ===========================================
// Export
// ===========================================

export { connection, close as closeConnection };
export * from "./types";