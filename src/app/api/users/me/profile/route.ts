import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import { User } from "@/lib/db/models";
import { z } from "zod";

// Combined schema for profile updates (base profile + role-specific)
const patchProfileSchema = z.object({
  // Base profile fields
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().max(20).optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  timezone: z.string().optional(),
  // Client-specific fields
  company: z.string().max(100).optional().nullable(),
  preferredWorkerId: z.string().optional().nullable(),
  // Worker-specific fields
  skills: z.array(z.string()).max(20).optional(),
  skillLevels: z.record(z.string(), z.enum(["junior", "mid", "senior"])).optional(),
  bio: z.string().max(500).optional().nullable(),
  availability: z.enum(["available", "busy", "offline"]).optional(),
  maxConcurrentJobs: z.number().min(1).max(10).optional(),
});

// GET /api/users/me/profile - Get current user's profile
export async function GET() {
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

    const user = await User.findById(session.user.id)
      .select("-passwordHash")
      .populate({
        path: "clientProfile.preferredWorkerId",
        select: "profile.firstName profile.lastName email",
      })
      .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "User not found" },
        },
        { status: 404 }
      );
    }

    // Build response based on role
    const responseData: Record<string, unknown> = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      profile: {
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        phone: user.profile.phone || null,
        avatar: user.profile.avatar || null,
        timezone: user.profile.timezone,
      },
    };

    // Include role-specific profile data
    if (user.role === "client" && user.clientProfile) {
      responseData.clientProfile = {
        company: user.clientProfile.company || null,
        preferredWorkerId: user.clientProfile.preferredWorkerId || null,
        totalJobs: user.clientProfile.totalJobs,
        totalSpent: user.clientProfile.totalSpent,
      };
    }

    if (user.role === "worker" && user.workerProfile) {
      responseData.workerProfile = {
        skills: user.workerProfile.skills || [],
        skillLevels: user.workerProfile.skillLevels || {},
        bio: user.workerProfile.bio || null,
        availability: user.workerProfile.availability,
        currentJobCount: user.workerProfile.currentJobCount,
        maxConcurrentJobs: user.workerProfile.maxConcurrentJobs,
        stats: user.workerProfile.stats || {
          completedJobs: 0,
          avgRating: 0,
          totalEarnings: 0,
        },
      };
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to fetch profile" },
      },
      { status: 500 }
    );
  }
}

// PATCH /api/users/me/profile - Update current user's profile
export async function PATCH(request: Request) {
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

    const body = await request.json();

    // Validate input
    const parsed = patchProfileSchema.safeParse(body);
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

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "User not found" },
        },
        { status: 404 }
      );
    }

    const {
      firstName,
      lastName,
      phone,
      avatar,
      timezone,
      company,
      preferredWorkerId,
      skills,
      skillLevels,
      bio,
      availability,
      maxConcurrentJobs,
    } = parsed.data;

    // Update base profile fields
    if (firstName !== undefined) user.profile.firstName = firstName;
    if (lastName !== undefined) user.profile.lastName = lastName;
    if (phone !== undefined) user.profile.phone = phone || undefined;
    if (avatar !== undefined) user.profile.avatar = avatar || undefined;
    if (timezone !== undefined) user.profile.timezone = timezone;

    // Update client-specific fields
    if (user.role === "client" && user.clientProfile) {
      if (company !== undefined) user.clientProfile.company = company || undefined;
      if (preferredWorkerId !== undefined) {
        user.clientProfile.preferredWorkerId = preferredWorkerId
          ? (preferredWorkerId as unknown as typeof user.clientProfile.preferredWorkerId)
          : undefined;
      }
    }

    // Update worker-specific fields
    if (user.role === "worker" && user.workerProfile) {
      if (skills !== undefined) user.workerProfile.skills = skills;
      if (skillLevels !== undefined) {
        // Mongoose Maps accept plain objects - cast through unknown
        (user.workerProfile as unknown as Record<string, unknown>).skillLevels = skillLevels;
      }
      if (bio !== undefined) user.workerProfile.bio = bio || undefined;
      if (availability !== undefined) user.workerProfile.availability = availability;
      if (maxConcurrentJobs !== undefined) user.workerProfile.maxConcurrentJobs = maxConcurrentJobs;
    }

    await user.save();

    // Fetch updated user with populated fields
    const updatedUser = await User.findById(session.user.id)
      .select("-passwordHash")
      .populate({
        path: "clientProfile.preferredWorkerId",
        select: "profile.firstName profile.lastName email",
      })
      .lean();

    // Build response
    const responseData: Record<string, unknown> = {
      id: updatedUser!._id.toString(),
      email: updatedUser!.email,
      role: updatedUser!.role,
      profile: {
        firstName: updatedUser!.profile.firstName,
        lastName: updatedUser!.profile.lastName,
        phone: updatedUser!.profile.phone || null,
        avatar: updatedUser!.profile.avatar || null,
        timezone: updatedUser!.profile.timezone,
      },
    };

    if (updatedUser!.role === "client" && updatedUser!.clientProfile) {
      responseData.clientProfile = {
        company: updatedUser!.clientProfile.company || null,
        preferredWorkerId: updatedUser!.clientProfile.preferredWorkerId || null,
        totalJobs: updatedUser!.clientProfile.totalJobs,
        totalSpent: updatedUser!.clientProfile.totalSpent,
      };
    }

    if (updatedUser!.role === "worker" && updatedUser!.workerProfile) {
      responseData.workerProfile = {
        skills: updatedUser!.workerProfile.skills || [],
        skillLevels: updatedUser!.workerProfile.skillLevels || {},
        bio: updatedUser!.workerProfile.bio || null,
        availability: updatedUser!.workerProfile.availability,
        currentJobCount: updatedUser!.workerProfile.currentJobCount,
        maxConcurrentJobs: updatedUser!.workerProfile.maxConcurrentJobs,
        stats: updatedUser!.workerProfile.stats,
      };
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to update profile" },
      },
      { status: 500 }
    );
  }
}
