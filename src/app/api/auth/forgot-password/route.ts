import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db/connection";
import { User } from "@/lib/db/models";
import { logger } from "@/lib/logger";
import { addNotificationJob } from "@/lib/queue";
import { checkRateLimit, RATE_LIMITS, rateLimitExceededResponse, getClientIdentifier } from "@/lib/rate-limit";

// Store reset tokens in memory (in production, use Redis or DB)
// Format: { token: { email, expiresAt } }
const resetTokens = new Map<string, { email: string; expiresAt: Date }>();

// Clean up expired tokens periodically
setInterval(() => {
  const now = new Date();
  for (const [token, data] of resetTokens.entries()) {
    if (data.expiresAt < now) {
      resetTokens.delete(token);
    }
  }
}, 60000); // Every minute

// ===========================================
// POST /api/auth/forgot-password
// ===========================================

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await checkRateLimit(
      `forgot-password:${identifier}`,
      RATE_LIMITS.passwordReset
    );

    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(rateLimitResult);
    }

    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    await connectDB();

    // Find user by email
    const user = await User.findOne({
      email: normalizedEmail,
      isActive: true,
    }).select("email profile.firstName");

    // Always return success to prevent email enumeration
    if (!user) {
      logger.info("ForgotPassword", `Reset requested for non-existent email: ${normalizedEmail}`);
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link.",
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token
    resetTokens.set(resetToken, {
      email: normalizedEmail,
      expiresAt,
    });

    // Generate reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    // Queue email notification
    try {
      await addNotificationJob({
        userId: user._id.toString(),
        email: normalizedEmail,
        type: "job_status_change", // Reuse existing template type
        data: {
          jobTitle: "Password Reset Request",
          status: "Action Required",
          firstName: user.profile?.firstName || "there",
          resetUrl,
          customHtml: `
            <p>We received a request to reset your password.</p>
            <p>Click the button below to set a new password:</p>
            <p style="margin: 20px 0;">
              <a href="${resetUrl}" style="background: #D45A45; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </p>
            <p style="font-size: 14px; color: #666;">
              This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>
          `,
        },
      });

      logger.info("ForgotPassword", `Reset email queued for ${normalizedEmail}`);
    } catch (emailError) {
      logger.error("ForgotPassword", "Failed to queue reset email", {
        error: String(emailError),
      });
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    });
  } catch (error) {
    logger.error("ForgotPassword", "Error processing request", {
      error: String(error),
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ===========================================
// Export token validation for reset endpoint
// ===========================================

export function validateResetToken(token: string): { valid: boolean; email?: string } {
  const data = resetTokens.get(token);

  if (!data) {
    return { valid: false };
  }

  if (data.expiresAt < new Date()) {
    resetTokens.delete(token);
    return { valid: false };
  }

  return { valid: true, email: data.email };
}

export function consumeResetToken(token: string): boolean {
  const isValid = resetTokens.has(token);
  resetTokens.delete(token);
  return isValid;
}
