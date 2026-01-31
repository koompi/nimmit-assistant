import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/lib/auth/auth";
import { connectDB } from "@/lib/db/connection";
import { Job, User } from "@/lib/db/models";
import { logger } from "@/lib/logger";
import { addNotificationJob } from "@/lib/queue";

// ===========================================
// GET /api/jobs/[id]/progress - Get progress updates
// ===========================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    await connectDB();

    // Build query based on role
    const query: Record<string, unknown> = { _id: id };

    if (session.user.role === "client") {
      query.clientId = session.user.id;
    } else if (session.user.role === "worker") {
      query.workerId = session.user.id;
    }
    // Admin can view any job

    const job = await Job.findOne(query).select("progressUpdates title status").lean();

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId: id,
        title: job.title,
        status: job.status,
        updates: job.progressUpdates || [],
      },
    });
  } catch (error) {
    logger.error("JobProgress", "Error fetching progress", {
      error: String(error),
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ===========================================
// POST /api/jobs/[id]/progress - Add progress update
// ===========================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "worker") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { content, percentage } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { success: false, error: "Content is required" },
        { status: 400 }
      );
    }

    if (percentage !== undefined && (percentage < 0 || percentage > 100)) {
      return NextResponse.json(
        { success: false, error: "Percentage must be between 0 and 100" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find job assigned to this worker
    const job = await Job.findOne({
      _id: id,
      workerId: session.user.id,
      status: { $in: ["assigned", "in_progress"] },
    }).populate("clientId", "email profile.firstName");

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found or not accessible" },
        { status: 404 }
      );
    }

    // Add progress update
    const update = {
      id: uuidv4(),
      content,
      percentage: percentage !== undefined ? percentage : undefined,
      createdAt: new Date(),
    };

    if (!job.progressUpdates) {
      job.progressUpdates = [];
    }
    job.progressUpdates.push(update);

    // If job is still "assigned", move to "in_progress"
    if (job.status === "assigned") {
      job.status = "in_progress";
      job.startedAt = new Date();
    }

    await job.save();

    // Notify client about the update
    try {
      const client = job.clientId as unknown as {
        _id: { toString: () => string };
        email: string;
        profile: { firstName: string };
      };

      if (client?.email) {
        await addNotificationJob({
          userId: client._id.toString(),
          email: client.email,
          type: "job_status_change",
          data: {
            jobTitle: job.title,
            status: `Progress Update: ${percentage ? `${percentage}%` : "New update"}`,
            workerName: session.user.name,
          },
        });
      }
    } catch (notifyError) {
      logger.warn("JobProgress", "Failed to notify client", {
        error: String(notifyError),
      });
    }

    logger.info("JobProgress", `Progress update added to job ${id}`);

    return NextResponse.json({
      success: true,
      message: "Progress update added",
      data: update,
    });
  } catch (error) {
    logger.error("JobProgress", "Error adding progress update", {
      error: String(error),
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
