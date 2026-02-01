import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import { Job, User } from "@/lib/db/models";
import {
  updateJobSchema,
  assignJobSchema,
  updateJobStatusSchema,
  completeJobSchema,
  addMessageSchema,
} from "@/lib/validations/job";
import { randomUUID } from "crypto";
import { storeJobContext } from "@/lib/ai/context";
import { calculateWorkerEarnings } from "@/lib/payments/credits";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/jobs/[id] - Get a single job
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Not authenticated" },
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectDB();

    const job = await Job.findById(id)
      .populate("clientId", "profile.firstName profile.lastName email")
      .populate("workerId", "profile.firstName profile.lastName email")
      .populate("assignedBy", "profile.firstName profile.lastName")
      .lean();

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Job not found" },
        },
        { status: 404 }
      );
    }

    // Check access
    const isClient = job.clientId._id.toString() === session.user.id;
    const isWorker = job.workerId?._id?.toString() === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isClient && !isWorker && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Access denied" },
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("Get job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to fetch job" },
      },
      { status: 500 }
    );
  }
}

// PATCH /api/jobs/[id] - Update a job
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Not authenticated" },
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    await connectDB();

    const job = await Job.findById(id);
    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Job not found" },
        },
        { status: 404 }
      );
    }

    const isClient = job.clientId.toString() === session.user.id;
    const isWorker = job.workerId?.toString() === session.user.id;
    const isAdmin = session.user.role === "admin";

    // Handle different update types based on action
    const { action } = body;

    // Admin: Assign job to worker
    if (action === "assign" && isAdmin) {
      const parsed = assignJobSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid input",
              details: parsed.error.flatten().fieldErrors,
            },
          },
          { status: 400 }
        );
      }

      const worker = await User.findById(parsed.data.workerId);
      if (!worker || worker.role !== "worker") {
        return NextResponse.json(
          {
            success: false,
            error: { code: "INVALID_WORKER", message: "Invalid worker" },
          },
          { status: 400 }
        );
      }

      job.workerId = worker._id;
      job.assignedBy = new Types.ObjectId(session.user.id);
      job.assignedAt = new Date();
      job.status = "assigned";
      if (parsed.data.estimatedHours) {
        job.estimatedHours = parsed.data.estimatedHours;
      }

      // Update worker's current job count
      await User.findByIdAndUpdate(worker._id, {
        $inc: { "workerProfile.currentJobCount": 1 },
      });

      await job.save();

      return NextResponse.json({
        success: true,
        data: job,
        message: "Job assigned successfully",
      });
    }

    // Worker: Update job status
    if (action === "updateStatus" && (isWorker || isAdmin)) {
      const parsed = updateJobStatusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid input",
              details: parsed.error.flatten().fieldErrors,
            },
          },
          { status: 400 }
        );
      }

      const { status, actualHours } = parsed.data;

      // Validate status transitions
      const validTransitions: Record<string, string[]> = {
        assigned: ["in_progress", "cancelled"],
        in_progress: ["review", "cancelled"],
        review: ["revision", "completed"],
        revision: ["in_progress"],
      };

      if (!validTransitions[job.status]?.includes(status)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_STATUS",
              message: `Cannot change status from ${job.status} to ${status}`,
            },
          },
          { status: 400 }
        );
      }

      job.status = status;

      if (status === "in_progress" && !job.startedAt) {
        job.startedAt = new Date();
      }

      if (actualHours !== undefined) {
        job.actualHours = actualHours;
      }

      await job.save();

      return NextResponse.json({
        success: true,
        data: job,
        message: "Job status updated",
      });
    }

    // Client: Complete/rate job
    if (action === "complete" && isClient) {
      if (job.status !== "review") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_STATUS",
              message: "Job must be in review to complete",
            },
          },
          { status: 400 }
        );
      }

      const parsed = completeJobSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid input",
              details: parsed.error.flatten().fieldErrors,
            },
          },
          { status: 400 }
        );
      }

      job.status = "completed";
      job.completedAt = new Date();
      job.rating = parsed.data.rating;
      job.feedback = parsed.data.feedback;

      // Calculate worker earnings based on credits charged
      if (job.creditsCharged) {
        job.workerEarnings = calculateWorkerEarnings(job.creditsCharged);
      }

      await job.save();

      // Store in context cloud (non-blocking)
      try {
        await storeJobContext(
          job._id.toString(),
          job.clientId.toString(),
          job.title,
          job.description,
          parsed.data.feedback
        );
      } catch (contextError) {
        console.error("Failed to store context (non-critical):", contextError);
      }

      // Update worker stats including pending earnings
      if (job.workerId) {
        const workerJobs = await Job.find({
          workerId: job.workerId,
          status: "completed",
          rating: { $exists: true },
        });

        const avgRating =
          workerJobs.reduce((sum, j) => sum + (j.rating || 0), 0) /
          workerJobs.length;

        const earningsToAdd = job.workerEarnings || 0;

        await User.findByIdAndUpdate(job.workerId, {
          $inc: {
            "workerProfile.stats.completedJobs": 1,
            "workerProfile.stats.totalEarnings": earningsToAdd,
            "workerProfile.currentJobCount": -1,
          },
          $set: { "workerProfile.stats.avgRating": avgRating },
        });
      }

      return NextResponse.json({
        success: true,
        data: job,
        message: "Job completed successfully",
      });
    }

    // Client: Add message
    if (action === "addMessage" && (isClient || isWorker || isAdmin)) {
      const parsed = addMessageSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid input",
              details: parsed.error.flatten().fieldErrors,
            },
          },
          { status: 400 }
        );
      }

      job.messages.push({
        id: randomUUID(),
        senderId: new Types.ObjectId(session.user.id),
        senderRole: session.user.role,
        message: parsed.data.message,
        timestamp: new Date(),
      });

      await job.save();

      return NextResponse.json({
        success: true,
        data: job,
        message: "Message added",
      });
    }

    // Worker: Add deliverables
    if (action === "addDeliverables" && (isWorker || isAdmin)) {
      const { deliverables } = body;

      if (!Array.isArray(deliverables) || deliverables.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Deliverables array is required",
            },
          },
          { status: 400 }
        );
      }

      // Add deliverables to job
      for (const deliverable of deliverables) {
        job.deliverables.push({
          id: deliverable.id || randomUUID(),
          name: deliverable.name,
          url: deliverable.url,
          size: deliverable.size,
          mimeType: deliverable.mimeType,
          version: job.deliverables.filter(d => d.name === deliverable.name).length + 1,
          uploadedAt: new Date(),
        });
      }

      await job.save();

      return NextResponse.json({
        success: true,
        data: job,
        message: "Deliverables added",
      });
    }

    // Client: Add files (reference files)
    if (action === "addFiles" && (isClient || isAdmin)) {
      const { files } = body;

      if (!Array.isArray(files) || files.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Files array is required",
            },
          },
          { status: 400 }
        );
      }

      // Add files to job
      for (const file of files) {
        job.files.push({
          id: file.id || randomUUID(),
          name: file.name,
          url: file.url,
          size: file.size,
          mimeType: file.mimeType,
          status: "verified",
          uploadedAt: new Date(),
        });
      }

      await job.save();

      return NextResponse.json({
        success: true,
        data: job,
        message: "Files added",
      });
    }

    // Client: Update job details (only if pending) OR Admin: Update job details (always)
    if ((isClient && job.status === "pending") || isAdmin) {
      const parsed = updateJobSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid input",
              details: parsed.error.flatten().fieldErrors,
            },
          },
          { status: 400 }
        );
      }

      Object.assign(job, parsed.data);
      await job.save();

      return NextResponse.json({
        success: true,
        data: job,
        message: "Job updated successfully",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "Action not allowed" },
      },
      { status: 403 }
    );
  } catch (error) {
    console.error("Update job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to update job" },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/[id] - Cancel/delete a job
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Not authenticated" },
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectDB();

    const job = await Job.findById(id);
    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Job not found" },
        },
        { status: 404 }
      );
    }

    const isClient = job.clientId.toString() === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isClient && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Access denied" },
        },
        { status: 403 }
      );
    }

    // Can only cancel if not completed
    if (job.status === "completed") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_STATUS",
            message: "Cannot cancel completed jobs",
          },
        },
        { status: 400 }
      );
    }

    // If assigned, update worker's job count
    if (job.workerId) {
      await User.findByIdAndUpdate(job.workerId, {
        $inc: { "workerProfile.currentJobCount": -1 },
      });
    }

    job.status = "cancelled";
    await job.save();

    return NextResponse.json({
      success: true,
      message: "Job cancelled successfully",
    });
  } catch (error) {
    console.error("Delete job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to cancel job" },
      },
      { status: 500 }
    );
  }
}
