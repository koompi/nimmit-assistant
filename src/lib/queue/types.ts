import type { Types } from "mongoose";

// ===========================================
// Job Analysis Queue Job
// ===========================================

export interface JobAnalysisJobData {
  jobId: string;
  title: string;
  description: string;
  category: string;
  clientId: string;
}

// ===========================================
// Auto Assign Queue Job
// ===========================================

export interface AutoAssignJobData {
  jobId: string;
  title: string;
  description: string;
  category: string;
}

// ===========================================
// Notification Queue Job
// ===========================================

export type NotificationType =
  | "job_assigned"        // Worker assigned to job
  | "job_status_change"   // Job status updated
  | "job_completed"       // Job completed by worker
  | "job_revision"        // Client requested revision
  | "worker_welcome";     // New worker registration

export interface NotificationJobData {
  userId: Types.ObjectId;
  email: string;
  type: NotificationType;
  data: {
    jobId?: string;
    jobTitle?: string;
    status?: string;
    workerName?: string;
    clientName?: string;
    // Additional context data
    [key: string]: unknown;
  };
}

// ===========================================
// Webhook Queue Job
// ===========================================

export type WebhookType = "stripe" | "custom";

export interface WebhookJobData {
  type: WebhookType;
  payload: unknown;
  headers: Record<string, string>;
  retryCount?: number;
}

// ===========================================
// Union Type for All Queue Jobs
// ===========================================

export type QueueJobData =
  | JobAnalysisJobData
  | AutoAssignJobData
  | NotificationJobData
  | WebhookJobData;

// ===========================================
// Job Status Enum (for updating job status)
// ===========================================

export type JobStatusUpdate = {
  jobId: string;
  status: "analyzing" | "assigned" | "completed" | "cancelled";
  metadata?: {
    workerId?: string;
    rating?: number;
    feedback?: string;
    actualHours?: number;
  };
};

// ===========================================
// Queue Configuration
// ===========================================

export interface QueueConfig {
  connection?: unknown;
  defaultJobOptions?: {
    removeOnComplete?: number;
    removeOnFail?: number;
    attempts?: number;
    backoff?: {
      type: "exponential" | "fixed";
      delay: number;
    };
  };
}

export const DEFAULT_QUEUE_CONFIG: Omit<QueueConfig, "connection"> = {
  defaultJobOptions: {
    removeOnComplete: 1000, // Keep last 1000 completed jobs
    removeOnFail: 5000, // Keep last 5000 failed jobs
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
};