import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB } from "@/lib/db/connection";
import { Briefing, Job, User } from "@/lib/db/models";
import { logger } from "@/lib/logger";
import { calculateJobCost, checkCredits } from "@/lib/payments/credits";

// ===========================================
// POST /api/briefing/submit - Create job from briefing
// ===========================================

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "client") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { briefingId } = body;

    if (!briefingId) {
      return NextResponse.json(
        { success: false, error: "Briefing ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the briefing
    const briefing = await Briefing.findOne({
      _id: briefingId,
      clientId: session.user.id,
      status: "active",
    });

    if (!briefing) {
      return NextResponse.json(
        { success: false, error: "Briefing session not found" },
        { status: 404 }
      );
    }

    if (!briefing.extractedBrief) {
      return NextResponse.json(
        { success: false, error: "No brief extracted from conversation" },
        { status: 400 }
      );
    }

    const brief = briefing.extractedBrief;

    // Get client for credit check
    const client = await User.findById(session.user.id);
    if (!client || !client.clientProfile) {
      return NextResponse.json(
        { success: false, error: "Client profile not found" },
        { status: 404 }
      );
    }

    // Calculate credit cost
    const creditCost = calculateJobCost(brief.category, brief.priority);
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
            },
          },
        },
        { status: 402 }
      );
    }

    // Deduct credits
    let rolloverToDeduct = 0;
    let creditsToDeduct = 0;

    if (client.clientProfile.billing?.rolloverCredits) {
      rolloverToDeduct = Math.min(
        client.clientProfile.billing.rolloverCredits,
        creditCost.total
      );
      creditsToDeduct = creditCost.total - rolloverToDeduct;
    } else {
      creditsToDeduct = creditCost.total;
    }

    // Update client credits
    await User.findByIdAndUpdate(session.user.id, {
      $inc: {
        "clientProfile.billing.credits": -creditsToDeduct,
        "clientProfile.billing.rolloverCredits": -rolloverToDeduct,
      },
    });

    // Create job
    const job = new Job({
      clientId: session.user.id,
      title: brief.title,
      description: brief.description,
      category: brief.category,
      priority: brief.priority,
      status: "pending",
      estimatedHours: brief.estimatedHours,
      creditsCharged: creditCost.total,
      contextFromPastWork: briefing.contextSummary,
      aiAnalysis: {
        requiredSkills: brief.keyRequirements,
        complexity:
          brief.estimatedHours && brief.estimatedHours > 8
            ? "complex"
            : brief.estimatedHours && brief.estimatedHours > 4
              ? "medium"
              : "simple",
        estimatedHours: brief.estimatedHours || null,
        confidence: brief.confidence,
        analyzedAt: new Date(),
      },
    });

    await job.save();

    // Update briefing status
    briefing.status = "completed";
    briefing.jobId = job._id;
    briefing.completedAt = new Date();
    await briefing.save();

    // Update client job count
    await User.findByIdAndUpdate(session.user.id, {
      $inc: { "clientProfile.totalJobs": 1 },
    });

    logger.info(
      "Briefing",
      `Job created from briefing: ${job._id} for client ${session.user.id}`
    );

    return NextResponse.json({
      success: true,
      data: {
        jobId: job._id.toString(),
        title: job.title,
        category: job.category,
        priority: job.priority,
        creditsCharged: creditCost.total,
      },
      message: "Job created successfully",
    });
  } catch (error) {
    logger.error("Briefing", "Error submitting briefing", { error: String(error) });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
