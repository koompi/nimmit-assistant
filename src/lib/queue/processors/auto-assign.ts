import { Job } from "bullmq";
import { connectDB } from "@/lib/db/connection";
import { Job as JobModel, User as UserModel } from "@/lib/db/models";
import { autoAssignJob } from "@/lib/ai/routing";
import { addNotificationJob } from "..";
import type { AutoAssignJobData } from "../types";

// Helper to safely extract client name from populated document
function getClientName(clientId: unknown): string {
  if (!clientId || typeof clientId !== "object") return "a client";
  const client = clientId as { profile?: { firstName?: string; lastName?: string } };
  const firstName = client.profile?.firstName || "";
  const lastName = client.profile?.lastName || "";
  return `${firstName} ${lastName}`.trim() || "a client";
}

/**
 * Process auto-assignment - Find and assign the best matching worker
 */
export async function processAutoAssign(job: Job<AutoAssignJobData>) {
  const { jobId, title, description, category } = job.data;

  console.log(`[AutoAssign] Starting assignment for job ${jobId}`);

  try {
    await connectDB();

    // Get the job with client info to check current status
    const jobDoc = await JobModel.findById(jobId).populate(
      "clientId",
      "profile.firstName profile.lastName"
    );
    if (!jobDoc) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Skip if already assigned
    if (jobDoc.workerId) {
      console.log(`[AutoAssign] Job ${jobId} already assigned, skipping`);
      return { success: true, message: "Job already assigned" };
    }

    // Attempt auto-assignment
    console.log(`[AutoAssign] Running auto-assignment for job ${jobId}...`);
    const result = await autoAssignJob(title, description, category);

    if (result.assigned && result.workerId) {
      // Update job with assignment
      await JobModel.findByIdAndUpdate(jobId, {
        workerId: result.workerId,
        status: "assigned",
        assignedAt: new Date(),
      });

      // Update worker's job count
      await UserModel.findByIdAndUpdate(result.workerId, {
        $inc: { "workerProfile.currentJobCount": 1 },
      });

      // Queue notification for the assigned worker
      const worker = await UserModel.findById(result.workerId);
      if (worker) {
        await addNotificationJob({
          userId: worker._id,
          email: worker.email,
          type: "job_assigned",
          data: {
            jobId: jobId,
            jobTitle: title,
            clientName: getClientName(jobDoc.clientId),
          },
        });
        console.log(`[AutoAssign] Notification queued for worker ${worker.email}`);
      }

      console.log(
        `[AutoAssign] Job ${jobId} assigned to ${result.workerName} ` +
        `(score: ${(result.score || 0 * 100).toFixed(0)}%)`
      );

      return {
        success: true,
        assigned: true,
        workerId: result.workerId,
        workerName: result.workerName,
        score: result.score,
        reason: result.reason,
      };
    }

    console.log(`[AutoAssign] Auto-assignment skipped: ${result.reason}`);

    return {
      success: true,
      assigned: false,
      reason: result.reason,
    };
  } catch (error) {
    console.error(`[AutoAssign] Error processing job ${jobId}:`, error);

    // Keep job in pending status for manual assignment
    try {
      await JobModel.findByIdAndUpdate(jobId, {
        status: "pending",
      });
    } catch (dbError) {
      console.error(`[AutoAssign] Failed to update job status:`, dbError);
    }

    throw error;
  }
}