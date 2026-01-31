import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { connectDB } from "@/lib/db/connection";
import { Application, User } from "@/lib/db/models";
import { auth } from "@/lib/auth/auth";
import { logger } from "@/lib/logger";
import { addNotificationJob } from "@/lib/queue";
import type { SkillLevel } from "@/types";

// GET /api/admin/applications - Fetch applications with optional filters
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        await connectDB();

        const url = new URL(req.url);
        const status = url.searchParams.get("status"); // pending, approved, rejected
        const search = url.searchParams.get("search");

        const filter: Record<string, unknown> = {};
        if (status && ["pending", "approved", "rejected"].includes(status)) {
            filter.status = status;
        }
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        const applications = await Application.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        // Also get stats
        const stats = await Application.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);

        const statsMap = {
            pending: 0,
            approved: 0,
            rejected: 0,
        };
        stats.forEach((s) => {
            if (s._id in statsMap) {
                statsMap[s._id as keyof typeof statsMap] = s.count;
            }
        });

        return NextResponse.json({
            success: true,
            data: applications,
            stats: statsMap,
        });
    } catch (error) {
        logger.error("AdminApplications", "Error fetching applications", { error: String(error) });
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH /api/admin/applications - Update application status
export async function PATCH(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { applicationId, status } = body;

        if (!applicationId || !["approved", "rejected"].includes(status)) {
            return NextResponse.json(
                { success: false, error: "Invalid request" },
                { status: 400 }
            );
        }

        await connectDB();

        // First, fetch the application to get its data
        const application = await Application.findById(applicationId);

        if (!application) {
            return NextResponse.json(
                { success: false, error: "Application not found" },
                { status: 404 }
            );
        }

        // Check if application is already processed
        if (application.status !== "pending") {
            return NextResponse.json(
                { success: false, error: "Application has already been processed" },
                { status: 400 }
            );
        }

        let createdUser = null;

        // If approved, create worker account
        if (status === "approved") {
            // Check if user with this email already exists
            const existingUser = await User.findOne({ email: application.email.toLowerCase() });
            if (existingUser) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "A user with this email already exists",
                    },
                    { status: 409 }
                );
            }

            // Generate a random temporary password
            const tempPassword = crypto.randomBytes(12).toString("base64").slice(0, 16);
            const passwordHash = await bcrypt.hash(tempPassword, 12);

            // Build skill levels map from AI analysis suggestion
            const suggestedLevel: SkillLevel = application.aiAnalysis?.suggestedLevel || "junior";
            const skillLevels: Record<string, SkillLevel> = {};
            for (const skill of application.selectedSkills) {
                skillLevels[skill] = suggestedLevel;
            }

            // Create the worker user
            const userData = {
                email: application.email.toLowerCase(),
                passwordHash,
                role: "worker" as const,
                profile: {
                    firstName: application.firstName,
                    lastName: application.lastName,
                    phone: application.phone,
                    timezone: "Asia/Phnom_Penh", // Default timezone for Cambodian workers
                },
                workerProfile: {
                    skills: application.selectedSkills,
                    skillLevels,
                    bio: application.bio,
                    availability: "offline" as const,
                    currentJobCount: 0,
                    maxConcurrentJobs: 3,
                    stats: {
                        completedJobs: 0,
                        avgRating: 0,
                        totalEarnings: 0,
                    },
                },
            };

            createdUser = await User.create(userData);

            // Update application with review info and converted user ID
            application.status = status;
            application.reviewedBy = session.user.id;
            application.reviewedAt = new Date();
            application.convertedUserId = createdUser._id;
            await application.save();

            logger.info("AdminApplications", `Application ${applicationId} approved by ${session.user.email}. Worker account created: ${createdUser.email}`);

            // Send welcome email with temporary password
            try {
                await addNotificationJob({
                    userId: createdUser._id,
                    email: createdUser.email,
                    type: "worker_welcome",
                    data: {
                        firstName: createdUser.profile.firstName,
                        tempPassword,
                    },
                });
                logger.info("AdminApplications", `Welcome email queued for ${createdUser.email}`);
            } catch (emailError) {
                logger.error("AdminApplications", "Failed to queue welcome email", { error: String(emailError) });
                // Continue - email failure shouldn't block account creation
            }

            return NextResponse.json({
                success: true,
                data: application,
                createdUser: {
                    id: createdUser._id.toString(),
                    email: createdUser.email,
                    name: `${createdUser.profile.firstName} ${createdUser.profile.lastName}`,
                    tempPassword, // Return temp password so admin can share it securely
                },
                message: "Application approved and worker account created",
            });
        }

        // If rejected, just update the status
        application.status = status;
        application.reviewedBy = session.user.id;
        application.reviewedAt = new Date();
        await application.save();

        logger.info("AdminApplications", `Application ${applicationId} rejected by ${session.user.email}`);

        // TODO: Send rejection email

        return NextResponse.json({
            success: true,
            data: application,
        });
    } catch (error) {
        logger.error("AdminApplications", "Error updating application", { error: String(error) });
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
