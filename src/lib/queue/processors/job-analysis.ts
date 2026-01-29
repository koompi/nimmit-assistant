import { Job } from "bullmq";
import { connectDB } from "@/lib/db/connection";
import { Job as JobModel } from "@/lib/db/models";
import { analyzeJob } from "@/lib/ai/routing";
import { getJobContext, formatContextForWorker } from "@/lib/ai/context";
import { addAutoAssignJob } from "..";
import type { JobAnalysisJobData } from "../types";

/**
 * Process job analysis - Analyze job requirements and retrieve relevant context
 */
export async function processJobAnalysis(job: Job<JobAnalysisJobData>) {
  const { jobId, title, description, category, clientId } = job.data;

  console.log(`[JobAnalysis] Starting analysis for job ${jobId}`);

  try {
    await connectDB();

    // Update job status to "analyzing"
    await JobModel.findByIdAndUpdate(jobId, {
      status: "analyzing",
    });

    // Step 1: Analyze job with AI
    console.log(`[JobAnalysis] Analyzing job ${jobId} with AI...`);
    const analysis = await analyzeJob(title, description, category);

    // Step 2: Get relevant context from past work
    let contextFromPastWork = "";
    try {
      console.log(`[JobAnalysis] Retrieving context for job ${jobId}...`);
      const contextItems = await getJobContext(clientId, title, description, 5);
      if (contextItems.length > 0) {
        contextFromPastWork = formatContextForWorker(contextItems);
        console.log(`[JobAnalysis] Found ${contextItems.length} relevant context items`);
      }
    } catch (contextError) {
      console.error(`[JobAnalysis] Context retrieval failed for job ${jobId}:`, contextError);
      // Non-critical error, continue without context
    }

    // Step 3: Update job with analysis results
    await JobModel.findByIdAndUpdate(jobId, {
      aiAnalysis: {
        requiredSkills: analysis.requiredSkills,
        complexity: analysis.complexity,
        estimatedHours: analysis.estimatedHours,
        confidence: analysis.confidence,
        analyzedAt: new Date(),
      },
      contextFromPastWork: contextFromPastWork || undefined,
      status: "pending", // Ready for assignment
    });

    console.log(
      `[JobAnalysis] Job ${jobId} analyzed. Complexity: ${analysis.complexity}, ` +
      `Skills: ${analysis.requiredSkills.join(", ")}`
    );

    // Step 4: Queue auto-assignment job
    await addAutoAssignJob({ jobId, title, description, category });

    return {
      success: true,
      analysis: {
        complexity: analysis.complexity,
        requiredSkills: analysis.requiredSkills,
        estimatedHours: analysis.estimatedHours,
      },
    };
  } catch (error) {
    console.error(`[JobAnalysis] Error processing job ${jobId}:`, error);

    // Update job status to indicate failure
    try {
      await JobModel.findByIdAndUpdate(jobId, {
        status: "pending", // Keep in pending for manual assignment
      });
    } catch (dbError) {
      console.error(`[JobAnalysis] Failed to update job status:`, dbError);
    }

    throw error;
  }
}