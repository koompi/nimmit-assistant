import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import { User } from "@/lib/db/models";
import { z } from "zod";

// Settings schema - stored as part of user or separate collection in future
const settingsSchema = z.object({
  notifications: z
    .object({
      email: z.boolean().optional(),
      jobUpdates: z.boolean().optional(),
      marketing: z.boolean().optional(),
      weeklyDigest: z.boolean().optional(),
    })
    .optional(),
  preferences: z
    .object({
      language: z.string().optional(),
      dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]).optional(),
      timeFormat: z.enum(["12h", "24h"]).optional(),
    })
    .optional(),
});

// Default settings for new users
const defaultSettings = {
  notifications: {
    email: true,
    jobUpdates: true,
    marketing: false,
    weeklyDigest: true,
  },
  preferences: {
    language: "en",
    dateFormat: "MM/DD/YYYY" as const,
    timeFormat: "12h" as const,
  },
};

// GET /api/users/me/settings - Get current user's settings
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

    const user = await User.findById(session.user.id).select("settings").lean();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "User not found" },
        },
        { status: 404 }
      );
    }

    // Return user settings or defaults
    // Note: settings field may not exist on user model yet - return defaults
    const settings = (user as unknown as Record<string, unknown>).settings || defaultSettings;

    // Type-safe merge of settings with defaults
    const userSettings = settings as typeof defaultSettings;
    return NextResponse.json({
      success: true,
      data: {
        notifications: {
          ...defaultSettings.notifications,
          ...(userSettings.notifications || {}),
        },
        preferences: {
          ...defaultSettings.preferences,
          ...(userSettings.preferences || {}),
        },
      },
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to fetch settings" },
      },
      { status: 500 }
    );
  }
}

// PATCH /api/users/me/settings - Update current user's settings
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
    const parsed = settingsSchema.safeParse(body);
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

    const { notifications, preferences } = parsed.data;

    // Get existing settings or use defaults
    const existingSettings = (user as unknown as Record<string, unknown>).settings || defaultSettings;
    const existingNotifications = (existingSettings as Record<string, unknown>).notifications || {};
    const existingPreferences = (existingSettings as Record<string, unknown>).preferences || {};

    // Merge settings
    const updatedSettings = {
      notifications: {
        ...defaultSettings.notifications,
        ...existingNotifications,
        ...notifications,
      },
      preferences: {
        ...defaultSettings.preferences,
        ...existingPreferences,
        ...preferences,
      },
    };

    // Save using $set to handle the settings field
    await User.findByIdAndUpdate(session.user.id, {
      $set: { settings: updatedSettings },
    });

    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to update settings" },
      },
      { status: 500 }
    );
  }
}
