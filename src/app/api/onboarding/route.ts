import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB } from "@/lib/db/connection";
import { User } from "@/lib/db/models/user";
import { z } from "zod";

const onboardingSchema = z.object({
  companyName: z.string().optional(),
  companySize: z.enum(["solo", "2-10", "11-50", "51-200", "200+"]),
  industry: z.string().min(1, "Please select an industry"),
  primaryTaskTypes: z.array(z.string()).min(1, "Select at least one task type"),
  howDidYouHear: z.string().optional(),
  timezone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    if (session.user.role !== "client") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only clients can complete onboarding" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = onboardingSchema.parse(body);

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    // Update client profile with onboarding data
    const clientProfile = user.clientProfile ?? {
      totalJobs: 0,
      totalSpent: 0,
    };

    clientProfile.company = validatedData.companyName || clientProfile.company;
    clientProfile.onboardingCompleted = true;
    clientProfile.onboarding = {
      companySize: validatedData.companySize,
      industry: validatedData.industry,
      primaryTaskTypes: validatedData.primaryTaskTypes,
      howDidYouHear: validatedData.howDidYouHear,
      completedAt: new Date(),
    };

    user.clientProfile = clientProfile as typeof user.clientProfile;

    // Update timezone if provided
    if (validatedData.timezone) {
      user.profile.timezone = validatedData.timezone;
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
      data: {
        onboardingCompleted: true,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid onboarding data",
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    console.error("Onboarding error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save onboarding data" } },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        onboardingCompleted: user.clientProfile?.onboardingCompleted ?? false,
        onboarding: user.clientProfile?.onboarding,
      },
    });
  } catch (error) {
    console.error("Get onboarding status error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to get onboarding status" } },
      { status: 500 }
    );
  }
}
