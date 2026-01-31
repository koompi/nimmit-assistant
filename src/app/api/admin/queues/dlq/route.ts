import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queues } from "@/lib/queue";
import { logger } from "@/lib/logger";

// ===========================================
// GET /api/admin/queues/dlq - Get failed jobs
// ===========================================

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const queueName = url.searchParams.get("queue") || "all";
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);

    const failedJobs: Array<{
      queue: string;
      jobId: string;
      name: string;
      data: unknown;
      failedReason: string;
      attemptsMade: number;
      timestamp: string;
    }> = [];

    // Get failed jobs from all or specific queue
    const queuesToCheck =
      queueName === "all"
        ? Object.entries(queues)
        : [[queueName, queues[queueName as keyof typeof queues]]].filter(
            ([, q]) => q
          );

    for (const [queueKey, queueItem] of queuesToCheck) {
      if (!queueItem || typeof queueItem === "string") continue;
      const queue = queueItem;

      try {
        const failed = await queue.getFailed(0, limit);

        for (const job of failed) {
          failedJobs.push({
            queue: queueKey as string,
            jobId: job.id || "unknown",
            name: job.name,
            data: job.data,
            failedReason: job.failedReason || "Unknown error",
            attemptsMade: job.attemptsMade,
            timestamp: job.timestamp
              ? new Date(job.timestamp).toISOString()
              : new Date().toISOString(),
          });
        }
      } catch (error) {
        logger.warn("DLQ", `Failed to get jobs from queue ${queueKey}`, {
          error: String(error),
        });
      }
    }

    // Sort by timestamp descending
    failedJobs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        jobs: failedJobs.slice(0, limit),
        total: failedJobs.length,
      },
    });
  } catch (error) {
    logger.error("DLQ", "Error fetching failed jobs", { error: String(error) });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ===========================================
// POST /api/admin/queues/dlq - Retry failed jobs
// ===========================================

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { queueName, jobIds, retryAll } = body;

    if (!queueName) {
      return NextResponse.json(
        { success: false, error: "Queue name is required" },
        { status: 400 }
      );
    }

    const queue = queues[queueName as keyof typeof queues];
    if (!queue) {
      return NextResponse.json(
        { success: false, error: "Queue not found" },
        { status: 404 }
      );
    }

    let retriedCount = 0;
    let failedCount = 0;

    if (retryAll) {
      // Retry all failed jobs in the queue
      const failed = await queue.getFailed(0, 1000);

      for (const job of failed) {
        try {
          await job.retry();
          retriedCount++;
        } catch {
          failedCount++;
        }
      }
    } else if (jobIds && Array.isArray(jobIds)) {
      // Retry specific jobs
      for (const jobId of jobIds) {
        try {
          const job = await queue.getJob(jobId);
          if (job && (await job.isFailed())) {
            await job.retry();
            retriedCount++;
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Must provide jobIds array or retryAll: true" },
        { status: 400 }
      );
    }

    logger.info("DLQ", `Retried ${retriedCount} jobs in ${queueName}`, {
      admin: session.user.email,
    });

    return NextResponse.json({
      success: true,
      data: {
        retriedCount,
        failedCount,
      },
      message: `Retried ${retriedCount} jobs`,
    });
  } catch (error) {
    logger.error("DLQ", "Error retrying jobs", { error: String(error) });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ===========================================
// DELETE /api/admin/queues/dlq - Remove failed jobs
// ===========================================

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { queueName, jobIds, removeAll } = body;

    if (!queueName) {
      return NextResponse.json(
        { success: false, error: "Queue name is required" },
        { status: 400 }
      );
    }

    const queue = queues[queueName as keyof typeof queues];
    if (!queue) {
      return NextResponse.json(
        { success: false, error: "Queue not found" },
        { status: 404 }
      );
    }

    let removedCount = 0;

    if (removeAll) {
      // Remove all failed jobs
      const failed = await queue.getFailed(0, 10000);
      for (const job of failed) {
        try {
          await job.remove();
          removedCount++;
        } catch {
          // Ignore removal errors
        }
      }
    } else if (jobIds && Array.isArray(jobIds)) {
      // Remove specific jobs
      for (const jobId of jobIds) {
        try {
          const job = await queue.getJob(jobId);
          if (job) {
            await job.remove();
            removedCount++;
          }
        } catch {
          // Ignore removal errors
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Must provide jobIds array or removeAll: true" },
        { status: 400 }
      );
    }

    logger.info("DLQ", `Removed ${removedCount} jobs from ${queueName}`, {
      admin: session.user.email,
    });

    return NextResponse.json({
      success: true,
      data: { removedCount },
      message: `Removed ${removedCount} jobs`,
    });
  } catch (error) {
    logger.error("DLQ", "Error removing jobs", { error: String(error) });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
