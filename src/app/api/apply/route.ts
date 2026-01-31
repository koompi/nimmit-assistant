import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { Application } from "@/lib/db/models";
import { applicationSchema } from "@/lib/validations/application";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Validate input
        const result = applicationSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { success: false, error: "Invalid data", details: result.error.issues },
                { status: 400 }
            );
        }

        await connectDB();

        // Check for existing application
        const existing = await Application.findOne({ email: result.data.email });
        if (existing) {
            return NextResponse.json(
                { success: false, error: "You have already applied with this email." },
                { status: 409 }
            );
        }

        // Create application
        const application = await Application.create({
            ...result.data,
            status: "pending",
        });

        logger.info("Application", `New application received from ${application.email}`);

        // TODO: Trigger AI analysis job async
        // await addApplicationAnalysisJob(application._id);

        return NextResponse.json(
            { success: true, message: "Application received successfully" },
            { status: 201 }
        );
    } catch (error) {
        logger.error("Application", "Error processing application", { error: String(error) });
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
