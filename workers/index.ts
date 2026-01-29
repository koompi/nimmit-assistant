// ===========================================
// BullMQ Worker Process
// ===========================================

import { Worker } from "bullmq";
import { connection } from "../src/lib/queue/connection";
import {
  processJobAnalysis,
  processAutoAssign,
  processNotification,
  PROCESSOR_CONFIG,
} from "../src/lib/queue/processors";

// ===========================================
// Worker Configuration
// ===========================================

const WORKER_OPTS = {
  connection,
  stalledInterval: 30000, // Check for stalled jobs every 30s
  maxStalledCount: 1, // Fail job after 1 stall
};

// ===========================================
// Create Workers
// ===========================================

console.log("Starting BullMQ workers...");

const workers: Worker[] = [];

// Job Analysis Worker
const jobAnalysisWorker = new Worker(
  "job-analysis",
  processJobAnalysis,
  {
    ...WORKER_OPTS,
    concurrency: PROCESSOR_CONFIG.jobAnalysis.concurrency,
  }
);
workers.push(jobAnalysisWorker);

// Auto Assign Worker
const autoAssignWorker = new Worker(
  "auto-assign",
  processAutoAssign,
  {
    ...WORKER_OPTS,
    concurrency: PROCESSOR_CONFIG.autoAssign.concurrency,
  }
);
workers.push(autoAssignWorker);

// Notification Worker
const notificationsWorker = new Worker(
  "notifications",
  processNotification,
  {
    ...WORKER_OPTS,
    concurrency: PROCESSOR_CONFIG.notifications.concurrency,
  }
);
workers.push(notificationsWorker);

console.log("Workers started:");
console.log("  - job-analysis (concurrency: 5)");
console.log("  - auto-assign (concurrency: 3)");
console.log("  - notifications (concurrency: 10)");

// ===========================================
// Event Handlers
// ===========================================

const setupWorkerEvents = (worker: Worker, name: string) => {
  worker.on("completed", (job) => {
    console.log(`[${name}] Job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[${name}] Job ${job?.id} failed:`, error.message);
  });

  worker.on("error", (error) => {
    console.error(`[${name}] Worker error:`, error);
  });

  worker.on("stalled", (jobId) => {
    console.warn(`[${name}] Job ${jobId} stalled`);
  });
};

setupWorkerEvents(jobAnalysisWorker, "job-analysis");
setupWorkerEvents(autoAssignWorker, "auto-assign");
setupWorkerEvents(notificationsWorker, "notifications");

// ===========================================
// Health Check
// ===========================================

// Heartbeat every 30 seconds to show worker is alive
setInterval(() => {
  const now = new Date().toISOString();
  console.log(`[${now.split("T")[1].split(".")[0]}] Workers heartbeat - OK`);
}, 30000);

// ===========================================
// Graceful Shutdown
// ===========================================

const shutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down workers gracefully...`);

  try {
    // Stop accepting new jobs
    await Promise.all(workers.map((w) => w.close()));

    // Close Redis connection
    await connection.quit();

    console.log("Workers shut down successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ===========================================
// Unhandled Rejection Handler
// ===========================================

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  shutdown("uncaughtException");
});