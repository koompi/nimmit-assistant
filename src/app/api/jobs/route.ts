import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import { Job, User } from "@/lib/db/models";
import { createJobSchema } from "@/lib/validations/job";
import { addJobAnalysisJob } from "@/lib/queue";
import { calculateJobCost, checkCredits } from "@/lib/payments/credits";
import { auditJob, auditPayment } from "@/lib/audit";

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

    // Get client's current credits
    const client = await User.findById(session.user.id);
    if (!client || !client.clientProfile) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Client profile not found" },
        },
        { status: 404 }
      );
    }

    // Calculate credit cost
    const creditCost = calculateJobCost(parsed.data.category, parsed.data.priority);
    const availableCredits =
      (client.clientProfile.billing?.credits || 0) +
      (client.clientProfile.billing?.rolloverCredits || 0);

    // Check if client has enough credits
    const creditCheck = checkCredits(availableCredits, creditCost.total);
    if (!creditCheck.hasEnough) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INSUFFICIENT_CREDITS",
            message: `Not enough credits. Required: ${creditCost.total}, Available: ${availableCredits}`,
            details: {
              required: creditCost.total,
              available: availableCredits,
              shortfall: creditCheck.shortfall,
              breakdown: creditCost.breakdown,
            },
          },
        },
        { status: 402 } // Payment Required
      );
    }

    // Deduct credits (use rollover first, then regular)
    let rolloverToDeduct = 0;
    let regularToDeduct = 0;
    const rolloverCredits = client.clientProfile.billing?.rolloverCredits || 0;
    const regularCredits = client.clientProfile.billing?.credits || 0;

    if (rolloverCredits >= creditCost.total) {
      // All from rollover
      rolloverToDeduct = creditCost.total;
    } else {
      // Use all rollover, rest from regular
      rolloverToDeduct = rolloverCredits;
      regularToDeduct = creditCost.total - rolloverCredits;
    }

    // Create the job with credit cost stored
    const job = await Job.create({
      clientId: session.user.id,
      ...parsed.data,
      status: "pending",
      creditsCharged: creditCost.total,
    });

    // Deduct credits and increment total jobs/spent
    await User.findByIdAndUpdate(session.user.id, {
      $inc: {
        "clientProfile.totalJobs": 1,
        "clientProfile.totalSpent": creditCost.total,
        "clientProfile.billing.credits": -regularToDeduct,
        "clientProfile.billing.rolloverCredits": -rolloverToDeduct,
      },
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

    // Audit log: job created
    auditJob(
      'job.created',
      { id: session.user.id, email: session.user.email, role: 'client' },
      job._id.toString(),
      `Job "${parsed.data.title}" created (${creditCost.total} credits charged)`,
      { category: parsed.data.category, priority: parsed.data.priority, creditsCharged: creditCost.total }
    );

    // Audit log: credits deducted
    auditPayment(
      'payment.credits_deducted',
      { id: session.user.id, email: session.user.email, role: 'client' },
      `${creditCost.total} credits deducted for job "${parsed.data.title}"`,
      { jobId: job._id.toString(), amount: creditCost.total, breakdown: creditCost.breakdown }
    );

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
