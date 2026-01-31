import { connectDB } from "@/lib/db/connection";
import { Job, User, Briefing } from "@/lib/db/models";
import { logger } from "@/lib/logger";

// ===========================================
// Rating Aggregation
// ===========================================

/**
 * Aggregate ratings for all workers
 * Updates workerProfile.stats.avgRating based on job ratings
 */
export async function aggregateWorkerRatings(): Promise<{
  processed: number;
  updated: number;
}> {
  await connectDB();

  let processed = 0;
  let updated = 0;

  try {
    // Get all workers
    const workers = await User.find({
      role: "worker",
      isActive: true,
    }).select("_id workerProfile.stats");

    for (const worker of workers) {
      processed++;

      // Calculate average rating from completed jobs
      const ratingAgg = await Job.aggregate([
        {
          $match: {
            workerId: worker._id,
            status: "completed",
            rating: { $exists: true, $gt: 0 },
          },
        },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$rating" },
            count: { $sum: 1 },
          },
        },
      ]);

      const result = ratingAgg[0];
      if (result && result.avgRating) {
        const newAvgRating = Math.round(result.avgRating * 10) / 10;
        const currentAvg = worker.workerProfile?.stats?.avgRating || 0;

        // Only update if changed
        if (Math.abs(newAvgRating - currentAvg) > 0.01) {
          await User.findByIdAndUpdate(worker._id, {
            "workerProfile.stats.avgRating": newAvgRating,
            "workerProfile.stats.completedJobs": result.count,
          });
          updated++;
        }
      }
    }

    logger.info("ScheduledTasks", `Rating aggregation complete`, {
      processed,
      updated,
    });

    return { processed, updated };
  } catch (error) {
    logger.error("ScheduledTasks", "Rating aggregation failed", {
      error: String(error),
    });
    throw error;
  }
}

// ===========================================
// Briefing Cleanup
// ===========================================

/**
 * Clean up abandoned briefing sessions
 * Marks sessions as abandoned if inactive for more than 24 hours
 */
export async function cleanupAbandonedBriefings(): Promise<{
  cleaned: number;
}> {
  await connectDB();

  try {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const result = await Briefing.updateMany(
      {
        status: "active",
        updatedAt: { $lt: cutoffDate },
      },
      {
        status: "abandoned",
      }
    );

    logger.info("ScheduledTasks", `Briefing cleanup complete`, {
      cleaned: result.modifiedCount,
    });

    return { cleaned: result.modifiedCount };
  } catch (error) {
    logger.error("ScheduledTasks", "Briefing cleanup failed", {
      error: String(error),
    });
    throw error;
  }
}

// ===========================================
// Stale Job Cleanup
// ===========================================

/**
 * Flag jobs that have been in progress for too long
 * Jobs in_progress for more than 7 days get flagged for review
 */
export async function flagStaleJobs(): Promise<{
  flagged: number;
}> {
  await connectDB();

  try {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    // Find stale jobs that aren't already flagged
    const staleJobs = await Job.find({
      status: "in_progress",
      startedAt: { $lt: cutoffDate },
      "confidenceFlag.flagged": { $ne: true },
    });

    let flagged = 0;

    for (const job of staleJobs) {
      job.confidenceFlag = {
        flagged: true,
        reason: "Job has been in progress for more than 7 days",
        flaggedAt: new Date(),
      };
      await job.save();
      flagged++;
    }

    if (flagged > 0) {
      logger.info("ScheduledTasks", `Flagged stale jobs`, { flagged });
    }

    return { flagged };
  } catch (error) {
    logger.error("ScheduledTasks", "Stale job flagging failed", {
      error: String(error),
    });
    throw error;
  }
}

// ===========================================
// Worker Job Count Sync
// ===========================================

/**
 * Sync worker current job counts
 * Fixes any discrepancies between actual active jobs and currentJobCount
 */
export async function syncWorkerJobCounts(): Promise<{
  synced: number;
}> {
  await connectDB();

  try {
    const workers = await User.find({
      role: "worker",
      isActive: true,
    }).select("_id workerProfile.currentJobCount");

    let synced = 0;

    for (const worker of workers) {
      // Count actual active jobs
      const activeJobCount = await Job.countDocuments({
        workerId: worker._id,
        status: { $in: ["assigned", "in_progress", "review", "revision"] },
      });

      const currentCount = worker.workerProfile?.currentJobCount || 0;

      if (activeJobCount !== currentCount) {
        await User.findByIdAndUpdate(worker._id, {
          "workerProfile.currentJobCount": activeJobCount,
        });
        synced++;
        logger.debug("ScheduledTasks", `Synced job count for worker`, {
          workerId: worker._id.toString(),
          was: currentCount,
          now: activeJobCount,
        });
      }
    }

    if (synced > 0) {
      logger.info("ScheduledTasks", `Synced worker job counts`, { synced });
    }

    return { synced };
  } catch (error) {
    logger.error("ScheduledTasks", "Worker job count sync failed", {
      error: String(error),
    });
    throw error;
  }
}

// ===========================================
// Run All Tasks
// ===========================================

/**
 * Run all scheduled tasks
 * Call this from a cron job or scheduled function
 */
export async function runAllScheduledTasks(): Promise<{
  ratings: { processed: number; updated: number };
  briefings: { cleaned: number };
  staleJobs: { flagged: number };
  jobCounts: { synced: number };
}> {
  logger.info("ScheduledTasks", "Starting scheduled tasks run");

  const results = {
    ratings: await aggregateWorkerRatings(),
    briefings: await cleanupAbandonedBriefings(),
    staleJobs: await flagStaleJobs(),
    jobCounts: await syncWorkerJobCounts(),
  };

  logger.info("ScheduledTasks", "Scheduled tasks complete", results);

  return results;
}
