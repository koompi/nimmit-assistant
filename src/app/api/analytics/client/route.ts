import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB } from "@/lib/db/connection";
import { Job } from "@/lib/db/models";
import { logger } from "@/lib/logger";

// ===========================================
// GET /api/analytics/client - Client analytics
// ===========================================

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "client") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const clientId = session.user.id;

    // Aggregate client job stats
    const statsAggregation = await Job.aggregate([
      { $match: { clientId: { $eq: clientId } } },
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
                pendingJobs: {
                  $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
                },
                inProgressJobs: {
                  $sum: {
                    $cond: [
                      { $in: ["$status", ["assigned", "in_progress", "review", "revision"]] },
                      1,
                      0,
                    ],
                  },
                },
                cancelledJobs: {
                  $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
                },
                totalCreditsSpent: { $sum: { $ifNull: ["$creditsCharged", 0] } },
                avgRating: { $avg: "$rating" },
                totalRatings: {
                  $sum: { $cond: [{ $gt: ["$rating", 0] }, 1, 0] },
                },
              },
            },
          ],

          // Completion time stats (for completed jobs)
          completionTime: [
            { $match: { status: "completed", completedAt: { $exists: true } } },
            {
              $project: {
                hoursToComplete: {
                  $divide: [
                    { $subtract: ["$completedAt", "$createdAt"] },
                    1000 * 60 * 60, // Convert ms to hours
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                avgHours: { $avg: "$hoursToComplete" },
                minHours: { $min: "$hoursToComplete" },
                maxHours: { $max: "$hoursToComplete" },
              },
            },
          ],

          // Revision stats
          revisionStats: [
            { $match: { status: "completed" } },
            {
              $group: {
                _id: null,
                jobsWithRevisions: {
                  $sum: {
                    $cond: [
                      { $gt: [{ $size: { $ifNull: ["$deliverables", []] } }, 1] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],

          // Jobs by category
          byCategory: [
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 },
                creditsSpent: { $sum: { $ifNull: ["$creditsCharged", 0] } },
              },
            },
            { $sort: { count: -1 } },
          ],

          // Jobs by month (last 6 months)
          byMonth: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
                },
              },
            },
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                count: { $sum: 1 },
                completed: {
                  $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
                },
                creditsSpent: { $sum: { $ifNull: ["$creditsCharged", 0] } },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ],

          // Recent jobs
          recentJobs: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $project: {
                _id: 1,
                title: 1,
                status: 1,
                category: 1,
                priority: 1,
                rating: 1,
                createdAt: 1,
                completedAt: 1,
                creditsCharged: 1,
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
      pendingJobs: 0,
      inProgressJobs: 0,
      cancelledJobs: 0,
      totalCreditsSpent: 0,
      avgRating: null,
      totalRatings: 0,
    };
    const completionTime = result.completionTime[0] || {
      avgHours: null,
      minHours: null,
      maxHours: null,
    };
    const revisionStats = result.revisionStats[0] || { jobsWithRevisions: 0 };

    // Calculate derived metrics
    const completionRate = overall.totalJobs > 0
      ? (overall.completedJobs / overall.totalJobs) * 100
      : 0;

    const firstTimeApprovalRate = overall.completedJobs > 0
      ? ((overall.completedJobs - revisionStats.jobsWithRevisions) / overall.completedJobs) * 100
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalJobs: overall.totalJobs,
          completedJobs: overall.completedJobs,
          pendingJobs: overall.pendingJobs,
          inProgressJobs: overall.inProgressJobs,
          cancelledJobs: overall.cancelledJobs,
          completionRate: Math.round(completionRate * 10) / 10,
          firstTimeApprovalRate: Math.round(firstTimeApprovalRate * 10) / 10,
          totalCreditsSpent: overall.totalCreditsSpent,
          avgRating: overall.avgRating ? Math.round(overall.avgRating * 10) / 10 : null,
          totalRatings: overall.totalRatings,
        },
        deliveryTime: {
          avgHours: completionTime.avgHours ? Math.round(completionTime.avgHours * 10) / 10 : null,
          minHours: completionTime.minHours ? Math.round(completionTime.minHours * 10) / 10 : null,
          maxHours: completionTime.maxHours ? Math.round(completionTime.maxHours * 10) / 10 : null,
        },
        byCategory: result.byCategory,
        byMonth: result.byMonth.map((m: { _id: { year: number; month: number }; count: number; completed: number; creditsSpent: number }) => ({
          month: `${m._id.year}-${String(m._id.month).padStart(2, "0")}`,
          jobs: m.count,
          completed: m.completed,
          creditsSpent: m.creditsSpent,
        })),
        recentJobs: result.recentJobs,
      },
    });
  } catch (error) {
    logger.error("ClientAnalytics", "Error fetching analytics", {
      error: String(error),
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
