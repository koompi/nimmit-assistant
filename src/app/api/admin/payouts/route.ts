import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB } from "@/lib/db/connection";
import { User, Job } from "@/lib/db/models";

// GET /api/admin/payouts - Get workers with pending earnings
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
        const format = url.searchParams.get("format"); // json or csv

        // Find all completed jobs that haven't been paid to workers
        const unpaidJobs = await Job.find({
            status: "completed",
            workerEarnings: { $gt: 0 },
            workerPaidAt: { $exists: false },
        })
            .populate("workerId", "email profile.firstName profile.lastName")
            .lean();

        // Group by worker
        const workerEarnings: Record<
            string,
            {
                workerId: string;
                email: string;
                name: string;
                pendingEarnings: number;
                jobCount: number;
                jobs: Array<{
                    jobId: string;
                    title: string;
                    earnings: number;
                    completedAt: Date;
                }>;
            }
        > = {};

        for (const job of unpaidJobs) {
            if (!job.workerId) continue;

            const worker = job.workerId as unknown as {
                _id: { toString: () => string };
                email: string;
                profile: { firstName: string; lastName: string };
            };
            const workerId = worker._id.toString();

            if (!workerEarnings[workerId]) {
                workerEarnings[workerId] = {
                    workerId,
                    email: worker.email,
                    name: `${worker.profile.firstName} ${worker.profile.lastName}`,
                    pendingEarnings: 0,
                    jobCount: 0,
                    jobs: [],
                };
            }

            workerEarnings[workerId].pendingEarnings += job.workerEarnings || 0;
            workerEarnings[workerId].jobCount += 1;
            workerEarnings[workerId].jobs.push({
                jobId: job._id.toString(),
                title: job.title,
                earnings: job.workerEarnings || 0,
                completedAt: job.completedAt!,
            });
        }

        const payoutData = Object.values(workerEarnings).sort(
            (a, b) => b.pendingEarnings - a.pendingEarnings
        );

        // Calculate totals
        const totalPending = payoutData.reduce((sum, w) => sum + w.pendingEarnings, 0);
        const totalJobs = payoutData.reduce((sum, w) => sum + w.jobCount, 0);

        // If CSV format requested
        if (format === "csv") {
            const csvRows = [
                ["Worker ID", "Email", "Name", "Pending Earnings (USD)", "Job Count"].join(","),
                ...payoutData.map((w) =>
                    [w.workerId, w.email, `"${w.name}"`, w.pendingEarnings.toFixed(2), w.jobCount].join(",")
                ),
                ["", "", "TOTAL", totalPending.toFixed(2), totalJobs].join(","),
            ];

            return new NextResponse(csvRows.join("\n"), {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="nimmit-payouts-${new Date().toISOString().split("T")[0]}.csv"`,
                },
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                workers: payoutData,
                summary: {
                    totalWorkers: payoutData.length,
                    totalPendingEarnings: totalPending,
                    totalJobs,
                },
            },
        });
    } catch (error) {
        console.error("Get payouts error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST /api/admin/payouts - Mark jobs as paid
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { jobIds, workerId } = body;

        if (!jobIds && !workerId) {
            return NextResponse.json(
                { success: false, error: "Must provide jobIds or workerId" },
                { status: 400 }
            );
        }

        await connectDB();

        const filter: Record<string, unknown> = {
            status: "completed",
            workerEarnings: { $gt: 0 },
            workerPaidAt: { $exists: false },
        };

        if (jobIds && Array.isArray(jobIds)) {
            filter._id = { $in: jobIds };
        } else if (workerId) {
            filter.workerId = workerId;
        }

        const result = await Job.updateMany(filter, {
            $set: { workerPaidAt: new Date() },
        });

        return NextResponse.json({
            success: true,
            data: {
                markedAsPaid: result.modifiedCount,
            },
            message: `Marked ${result.modifiedCount} jobs as paid`,
        });
    } catch (error) {
        console.error("Mark payouts error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
