import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  runAllScheduledTasks,
  aggregateWorkerRatings,
  cleanupAbandonedBriefings,
  flagStaleJobs,
  syncWorkerJobCounts,
} from "@/lib/scheduled/tasks";

// ===========================================
// POST /api/admin/scheduled - Run scheduled tasks
// ===========================================

export async function POST(req: NextRequest) {
  try {
    // Check for cron secret or admin auth
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;

    // If cron secret matches, allow
    const isCronRequest = expectedSecret && cronSecret === expectedSecret;

    if (!isCronRequest) {
      // Otherwise, require admin auth
      const session = await auth();
      if (!session?.user || session.user.role !== "admin") {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const { task } = body;

    let result;

    if (task) {
      // Run specific task
      switch (task) {
        case "ratings":
          result = { ratings: await aggregateWorkerRatings() };
          break;
        case "briefings":
          result = { briefings: await cleanupAbandonedBriefings() };
          break;
        case "staleJobs":
          result = { staleJobs: await flagStaleJobs() };
          break;
        case "jobCounts":
          result = { jobCounts: await syncWorkerJobCounts() };
          break;
        default:
          return NextResponse.json(
            { success: false, error: `Unknown task: ${task}` },
            { status: 400 }
          );
      }
    } else {
      // Run all tasks
      result = await runAllScheduledTasks();
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: task ? `Task '${task}' completed` : "All scheduled tasks completed",
    });
  } catch (error) {
    logger.error("ScheduledAPI", "Error running scheduled tasks", {
      error: String(error),
    });
    return NextResponse.json(
      { success: false, error: "Failed to run scheduled tasks" },
      { status: 500 }
    );
  }
}

// ===========================================
// GET /api/admin/scheduled - Get task info
// ===========================================

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        tasks: [
          {
            id: "ratings",
            name: "Aggregate Worker Ratings",
            description: "Updates avgRating for all workers based on job ratings",
          },
          {
            id: "briefings",
            name: "Cleanup Abandoned Briefings",
            description: "Marks briefings inactive >24h as abandoned",
          },
          {
            id: "staleJobs",
            name: "Flag Stale Jobs",
            description: "Flags jobs in_progress >7 days for review",
          },
          {
            id: "jobCounts",
            name: "Sync Worker Job Counts",
            description: "Fixes discrepancies in currentJobCount",
          },
        ],
        usage: {
          runAll: "POST /api/admin/scheduled",
          runOne: "POST /api/admin/scheduled with { task: 'taskId' }",
          cronHeader: "x-cron-secret: <CRON_SECRET env var>",
        },
      },
    });
  } catch (error) {
    logger.error("ScheduledAPI", "Error getting task info", {
      error: String(error),
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
