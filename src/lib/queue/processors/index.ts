// ===========================================
// Processor Registry
// ===========================================

// Export all processors
export { processJobAnalysis } from "./job-analysis";
export { processAutoAssign } from "./auto-assign";
export { processNotification } from "./notifications";

// Processor configuration
export const PROCESSOR_CONFIG = {
  jobAnalysis: {
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000, // 10 jobs per second
    },
  },
  autoAssign: {
    concurrency: 3,
    limiter: {
      max: 5,
      duration: 1000, // 5 jobs per second
    },
  },
  notifications: {
    concurrency: 10,
    limiter: {
      max: 20,
      duration: 1000, // 20 emails per second
    },
  },
} as const;