import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import { Job, User } from "@/lib/db/models";
import { createJobSchema } from "@/lib/validations/job";
import { addJobAnalysisJob } from "@/lib/queue";

// GET /api/jobs - List jobs based on user role
export async function GET(request: Request) {
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

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build query based on role
    const query: Record<string, unknown> = {};

    if (session.user.role === "client") {
      query.clientId = session.user.id;
    } else if (session.user.role === "worker") {
      query.workerId = session.user.id;
    }
    // Admin sees all jobs

    if (status) {
      query.status = status;
    }

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("clientId", "profile.firstName profile.lastName email")
        .populate("workerId", "profile.firstName profile.lastName email")
        .lean(),
      Job.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get jobs error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to fetch jobs" },
      },
      { status: 500 }
    );
  }
}

// POST /api/jobs - Create a new job (clients only)
export async function POST(request: Request) {
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

    if (session.user.role !== "client") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Only clients can create jobs" },
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const parsed = createJobSchema.safeParse(body);
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

    await connectDB();

    // Create the job immediately with "pending" status
    // AI analysis and auto-assignment will be processed asynchronously by workers
    const job = await Job.create({
      clientId: session.user.id,
      ...parsed.data,
      status: "pending",
    });

    // Increment client's total jobs
    await User.findByIdAndUpdate(session.user.id, {
      $inc: { "clientProfile.totalJobs": 1 },
    });

    // Queue job analysis (non-blocking, processed by worker)
    try {
      await addJobAnalysisJob({
        jobId: job._id.toString(),
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        clientId: session.user.id,
      });
    } catch (queueError) {
      console.error("Failed to queue job analysis:", queueError);
      // Job is still created, analysis can be triggered manually
    }

    // Fetch the job with populated references
    const createdJob = await Job.findById(job._id)
      .populate("clientId", "profile.firstName profile.lastName email")
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: createdJob,
        message: "Job created and queued for analysis",
      },
      { status: 202 } // 202 Accepted - async processing
    );
  } catch (error) {
    console.error("Create job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to create job" },
      },
      { status: 500 }
    );
  }
}
