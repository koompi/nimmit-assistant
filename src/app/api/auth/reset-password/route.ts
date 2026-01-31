import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/connection";
import { User } from "@/lib/db/models";
import { logger } from "@/lib/logger";
import { checkRateLimit, RATE_LIMITS, rateLimitExceededResponse, getClientIdentifier } from "@/lib/rate-limit";
import { validateResetToken, consumeResetToken } from "../forgot-password/route";

// ===========================================
// POST /api/auth/reset-password
// ===========================================

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await checkRateLimit(
      `reset-password:${identifier}`,
      RATE_LIMITS.passwordReset
    );

    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(rateLimitResult);
    }

    const body = await req.json();
    const { token, password } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, error: "Reset token is required" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Validate token
    const tokenData = validateResetToken(token);

    if (!tokenData.valid || !tokenData.email) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user
    const user = await User.findOne({
      email: tokenData.email,
      isActive: true,
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password
    user.passwordHash = passwordHash;
    await user.save();

    // Consume (delete) the token
    consumeResetToken(token);

    logger.info("ResetPassword", `Password reset successful for ${tokenData.email}`);

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    logger.error("ResetPassword", "Error processing request", {
      error: String(error),
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ===========================================
// GET /api/auth/reset-password - Validate token
// ===========================================

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const tokenData = validateResetToken(token);

    return NextResponse.json({
      success: true,
      data: {
        valid: tokenData.valid,
      },
    });
  } catch (error) {
    logger.error("ResetPassword", "Error validating token", {
      error: String(error),
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
