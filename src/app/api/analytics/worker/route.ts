import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB } from "@/lib/db/connection";
import { Job, User } from "@/lib/db/models";
import { logger } from "@/lib/logger";

// ===========================================
// GET /api/analytics/worker - Worker analytics
// ===========================================

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "worker") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const workerId = session.user.id;

    // Get worker profile stats
    const worker = await User.findById(workerId).select("workerProfile").lean();
    const workerStats = worker?.workerProfile?.stats || {
      completedJobs: 0,
      avgRating: 0,
      totalEarnings: 0,
    };

    // Aggregate worker job stats
    const statsAggregation = await Job.aggregate([
      { $match: { workerId: { $eq: workerId } } },
      {
        $facet: {
          // Overall stats
          overall: [
            {
              $group: {
                _id: null,
                totalJobs: { $sum: 1 },
                completedJobs: {
                  $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
                },
                activeJobs: {
                  $sum: {
                    $cond: [
                      { $in: ["$status", ["assigned", "in_progress", "review", "revision"]] },
                      1,
                      0,
                    ],
                  },
                },
                avgRating: { $avg: "$rating" },
                ratingCount: {
                  $sum: { $cond: [{ $gt: ["$rating", 0] }, 1, 0] },
                },
                totalEarnings: { $sum: { $ifNull: ["$workerEarnings", 0] } },
                paidEarnings: {
                  $sum: {
                    $cond: [
                      { $ifNull: ["$workerPaidAt", false] },
                      "$workerEarnings",
                      0,
                    ],
                  },
                },
                pendingEarnings: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$status", "completed"] },
                          { $not: { $ifNull: ["$workerPaidAt", false] } },
                        ],
                      },
                      "$workerEarnings",
                      0,
                    ],
                  },
                },
              },
            },
          ],

          // Completion time stats
          completionTime: [
            { $match: { status: "completed", completedAt: { $exists: true }, startedAt: { $exists: true } } },
            {
              $project: {
                hoursToComplete: {
                  $divide: [
                    { $subtract: ["$completedAt", "$startedAt"] },
                    1000 * 60 * 60,
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                avgHours: { $avg: "$hoursToComplete" },
              },
            },
          ],

          // Rating distribution
          ratingDistribution: [
            { $match: { rating: { $exists: true, $gt: 0 } } },
            {
              $group: {
                _id: "$rating",
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],

          // Jobs by category
          byCategory: [
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 },
                completed: {
                  $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
                },
                earnings: { $sum: { $ifNull: ["$workerEarnings", 0] } },
              },
            },
            { $sort: { count: -1 } },
          ],

          // Earnings by month (last 6 months)
          earningsByMonth: [
            {
              $match: {
                status: "completed",
                completedAt: {
                  $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
                },
              },
            },
            {
              $group: {
                _id: {
                  year: { $year: "$completedAt" },
                  month: { $month: "$completedAt" },
                },
                jobsCompleted: { $sum: 1 },
                earnings: { $sum: { $ifNull: ["$workerEarnings", 0] } },
                avgRating: { $avg: "$rating" },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ],

          // Performance metrics
          performance: [
            { $match: { status: "completed" } },
            {
              $group: {
                _id: null,
                onTimeDeliveries: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          { $eq: ["$dueDate", null] },
                          { $lte: ["$completedAt", "$dueDate"] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                totalCompleted: { $sum: 1 },
                fiveStarRatings: {
                  $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] },
                },
                totalRatings: {
                  $sum: { $cond: [{ $gt: ["$rating", 0] }, 1, 0] },
                },
              },
            },
          ],

          // Recent jobs
          recentJobs: [
            { $sort: { updatedAt: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: "users",
                localField: "clientId",
                foreignField: "_id",
                as: "client",
              },
            },
            { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                title: 1,
                status: 1,
                category: 1,
                priority: 1,
                rating: 1,
                workerEarnings: 1,
                createdAt: 1,
                completedAt: 1,
                clientName: {
                  $concat: [
                    { $ifNull: ["$client.profile.firstName", ""] },
                    " ",
                    { $ifNull: ["$client.profile.lastName", ""] },
                  ],
                },
              },
            },
          ],
        },
      },
    ]);

    const result = statsAggregation[0];
    const overall = result.overall[0] || {
      totalJobs: 0,
      completedJobs: 0,
      activeJobs: 0,
      avgRating: null,
      ratingCount: 0,
      totalEarnings: 0,
      paidEarnings: 0,
      pendingEarnings: 0,
    };
    const completionTime = result.completionTime[0] || { avgHours: null };
    const performance = result.performance[0] || {
      onTimeDeliveries: 0,
      totalCompleted: 0,
      fiveStarRatings: 0,
      totalRatings: 0,
    };

    // Calculate derived metrics
    const completionRate = overall.totalJobs > 0
      ? (overall.completedJobs / overall.totalJobs) * 100
      : 0;

    const onTimeRate = performance.totalCompleted > 0
      ? (performance.onTimeDeliveries / performance.totalCompleted) * 100
      : 0;

    const fiveStarRate = performance.totalRatings > 0
      ? (performance.fiveStarRatings / performance.totalRatings) * 100
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalJobs: overall.totalJobs,
          completedJobs: overall.completedJobs,
          activeJobs: overall.activeJobs,
          completionRate: Math.round(completionRate * 10) / 10,
          avgRating: overall.avgRating ? Math.round(overall.avgRating * 10) / 10 : null,
          ratingCount: overall.ratingCount,
        },
        earnings: {
          totalEarnings: Math.round(overall.totalEarnings * 100) / 100,
          paidEarnings: Math.round(overall.paidEarnings * 100) / 100,
          pendingEarnings: Math.round(overall.pendingEarnings * 100) / 100,
        },
        performance: {
          avgCompletionHours: completionTime.avgHours
            ? Math.round(completionTime.avgHours * 10) / 10
            : null,
          onTimeRate: Math.round(onTimeRate * 10) / 10,
          fiveStarRate: Math.round(fiveStarRate * 10) / 10,
        },
        ratingDistribution: result.ratingDistribution,
        byCategory: result.byCategory,
        earningsByMonth: result.earningsByMonth.map((m: { _id: { year: number; month: number }; jobsCompleted: number; earnings: number; avgRating: number | null }) => ({
          month: `${m._id.year}-${String(m._id.month).padStart(2, "0")}`,
          jobsCompleted: m.jobsCompleted,
          earnings: Math.round(m.earnings * 100) / 100,
          avgRating: m.avgRating ? Math.round(m.avgRating * 10) / 10 : null,
        })),
        recentJobs: result.recentJobs,
      },
    });
  } catch (error) {
    logger.error("WorkerAnalytics", "Error fetching analytics", {
      error: String(error),
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
