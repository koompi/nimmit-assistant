import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB } from "@/lib/db/connection";
import { Job } from "@/lib/db/models";
import { logger } from "@/lib/logger";
import { addNotificationJob } from "@/lib/queue";

// ===========================================
// POST /api/jobs/[id]/flag - Flag job for uncertainty
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
    const { reason } = body;

    if (!reason || typeof reason !== "string") {
      return NextResponse.json(
        { success: false, error: "Reason is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find job assigned to this worker
    const job = await Job.findOne({
      _id: id,
      workerId: session.user.id,
      status: { $in: ["assigned", "in_progress"] },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found or not accessible" },
        { status: 404 }
      );
    }

    // Set confidence flag
    job.confidenceFlag = {
      flagged: true,
      reason,
      flaggedAt: new Date(),
    };
    await job.save();

    // Notify admin about the flag
    try {
      // Find an admin to notify (in production, you'd have a better admin selection strategy)
      const { User } = await import("@/lib/db/models");
      const admin = await User.findOne({ role: "admin", isActive: true });

      if (admin) {
        await addNotificationJob({
          userId: admin._id.toString(),
          email: admin.email,
          type: "job_status_change",
          data: {
            jobTitle: job.title,
            status: `Confidence Flag: ${reason}`,
            workerName: session.user.name,
          },
        });
      }
    } catch (notifyError) {
      logger.warn("JobFlag", "Failed to notify admin", {
        error: String(notifyError),
      });
    }

    logger.info("JobFlag", `Job ${id} flagged by worker ${session.user.id}`, {
      reason,
    });

    return NextResponse.json({
      success: true,
      message: "Job flagged for review",
      data: {
        flagged: true,
        reason,
        flaggedAt: job.confidenceFlag.flaggedAt,
      },
    });
  } catch (error) {
    logger.error("JobFlag", "Error flagging job", { error: String(error) });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ===========================================
// DELETE /api/jobs/[id]/flag - Remove flag (admin only)
// ===========================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    await connectDB();

    const job = await Job.findById(id);

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }

    if (!job.confidenceFlag?.flagged) {
      return NextResponse.json(
        { success: false, error: "Job is not flagged" },
        { status: 400 }
      );
    }

    // Resolve the flag
    job.confidenceFlag.flagged = false;
    job.confidenceFlag.resolvedAt = new Date();
    job.confidenceFlag.resolvedBy = session.user.id as unknown as typeof job.confidenceFlag.resolvedBy;
    await job.save();

    logger.info("JobFlag", `Job ${id} flag resolved by admin ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: "Flag resolved",
    });
  } catch (error) {
    logger.error("JobFlag", "Error resolving flag", { error: String(error) });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
