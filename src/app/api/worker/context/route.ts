import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB } from "@/lib/db/connection";
import { Job } from "@/lib/db/models";
import { logger } from "@/lib/logger";
import { getJobContext, formatContextForWorker } from "@/lib/ai/context";

// ===========================================
// GET /api/worker/context - Search for similar past jobs
// ===========================================

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "worker") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "Job ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get the job to search context for
    const job = await Job.findOne({
      _id: jobId,
      workerId: session.user.id,
    }).lean();

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }

    // If job already has context, return it
    if (job.contextFromPastWork) {
      return NextResponse.json({
        success: true,
        data: {
          context: job.contextFromPastWork,
          source: "cached",
        },
      });
    }

    // Search for similar past jobs for this client
    try {
      const contextItems = await getJobContext(
        job.clientId.toString(),
        job.title,
        job.description,
        5
      );

      const formattedContext = formatContextForWorker(contextItems);

      // Cache context on job for future requests
      await Job.findByIdAndUpdate(jobId, {
        contextFromPastWork: formattedContext,
      });

      return NextResponse.json({
        success: true,
        data: {
          context: formattedContext,
          items: contextItems.map((item) => ({
            id: item.id,
            type: item.type,
            content: item.content,
            similarity: item.similarity,
          })),
          source: "pinecone",
        },
      });
    } catch (contextError) {
      // If Pinecone fails, return empty context
      logger.warn("WorkerContext", "Context retrieval failed", {
        error: String(contextError),
      });

      return NextResponse.json({
        success: true,
        data: {
          context: "No context available from previous work.",
          source: "fallback",
        },
      });
    }
  } catch (error) {
    logger.error("WorkerContext", "Error fetching context", {
      error: String(error),
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
