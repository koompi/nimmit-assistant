// Admin Analytics API
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/connection';
import { Job, User } from '@/lib/db/models';

interface JobStatusCount {
  _id: string;
  count: number;
}

interface DailyJobCount {
  _id: { year: number; month: number; day: number };
  count: number;
  revenue: number;
}

interface WorkerMetrics {
  _id: string;
  name: string;
  completedJobs: number;
  avgRating: number;
  totalEarnings: number;
  currentJobs: number;
}

interface CategoryCount {
  _id: string;
  count: number;
}

/**
 * GET /api/admin/analytics
 * Get platform-wide analytics for admin dashboard
 *
 * Query params:
 * - period: '7d' | '30d' | '90d' (default: '30d')
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';

    // Calculate date range
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Run all queries in parallel
    const [
      totalUsers,
      totalClients,
      totalWorkers,
      activeWorkers,
      jobsByStatus,
      jobsByCategory,
      dailyJobs,
      topWorkers,
      recentJobs,
      atRiskClients,
      overallStats,
    ] = await Promise.all([
      // Total users
      User.countDocuments({ isActive: true }),

      // Total clients
      User.countDocuments({ role: 'client', isActive: true }),

      // Total workers
      User.countDocuments({ role: 'worker', isActive: true }),

      // Active workers (available)
      User.countDocuments({
        role: 'worker',
        isActive: true,
        'workerProfile.availability': 'available',
      }),

      // Jobs by status
      Job.aggregate<JobStatusCount>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Jobs by category
      Job.aggregate<CategoryCount>([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),

      // Daily job count and revenue for period
      Job.aggregate<DailyJobCount>([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
            revenue: { $sum: { $ifNull: ['$creditsCharged', 0] } },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),

      // Top workers by completed jobs
      User.aggregate<WorkerMetrics>([
        { $match: { role: 'worker', isActive: true } },
        {
          $project: {
            name: { $concat: ['$profile.firstName', ' ', '$profile.lastName'] },
            completedJobs: { $ifNull: ['$workerProfile.stats.completedJobs', 0] },
            avgRating: { $ifNull: ['$workerProfile.stats.avgRating', 0] },
            totalEarnings: { $ifNull: ['$workerProfile.stats.totalEarnings', 0] },
            currentJobs: { $ifNull: ['$workerProfile.currentJobCount', 0] },
          },
        },
        { $sort: { completedJobs: -1 } },
        { $limit: 10 },
      ]),

      // Recent jobs (last 10)
      Job.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('clientId', 'profile.firstName profile.lastName')
        .populate('workerId', 'profile.firstName profile.lastName')
        .lean(),

      // At-risk clients (no jobs in 30 days)
      User.aggregate([
        { $match: { role: 'client', isActive: true } },
        {
          $lookup: {
            from: 'jobs',
            localField: '_id',
            foreignField: 'clientId',
            as: 'jobs',
          },
        },
        {
          $project: {
            name: { $concat: ['$profile.firstName', ' ', '$profile.lastName'] },
            email: '$email',
            lastJobDate: { $max: '$jobs.createdAt' },
            totalJobs: { $size: '$jobs' },
          },
        },
        {
          $match: {
            $or: [
              { lastJobDate: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
              { lastJobDate: null },
            ],
            totalJobs: { $gt: 0 },
          },
        },
        { $sort: { lastJobDate: 1 } },
        { $limit: 10 },
      ]),

      // Overall stats
      Job.aggregate([
        {
          $group: {
            _id: null,
            totalJobs: { $sum: 1 },
            completedJobs: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            totalRevenue: { $sum: { $ifNull: ['$creditsCharged', 0] } },
            totalPayouts: { $sum: { $ifNull: ['$workerEarnings', 0] } },
            avgRating: { $avg: '$rating' },
          },
        },
      ]),
    ]);

    // Process job status counts into object
    const statusCounts: Record<string, number> = {};
    jobsByStatus.forEach((s) => {
      statusCounts[s._id] = s.count;
    });

    // Process category counts
    const categoryCounts: Record<string, number> = {};
    jobsByCategory.forEach((c) => {
      categoryCounts[c._id] = c.count;
    });

    // Format daily data for charts
    const chartData = dailyJobs.map((d) => ({
      date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
      jobs: d.count,
      revenue: d.revenue,
    }));

    // Format recent jobs
    const formattedRecentJobs = recentJobs.map((job) => {
      const clientData = job.clientId as unknown as { profile?: { firstName?: string; lastName?: string } } | null;
      const workerData = job.workerId as unknown as { profile?: { firstName?: string; lastName?: string } } | null;

      return {
        id: job._id.toString(),
        title: job.title,
        status: job.status,
        category: job.category,
        client: clientData?.profile
          ? `${clientData.profile.firstName || ''} ${clientData.profile.lastName || ''}`.trim() || 'Unknown'
          : 'Unknown',
        worker: workerData?.profile
          ? `${workerData.profile.firstName || ''} ${workerData.profile.lastName || ''}`.trim() || 'Unassigned'
          : 'Unassigned',
        createdAt: job.createdAt,
      };
    });

    const stats = overallStats[0] || {
      totalJobs: 0,
      completedJobs: 0,
      totalRevenue: 0,
      totalPayouts: 0,
      avgRating: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalClients,
          totalWorkers,
          activeWorkers,
          totalJobs: stats.totalJobs,
          completedJobs: stats.completedJobs,
          completionRate: stats.totalJobs > 0
            ? Math.round((stats.completedJobs / stats.totalJobs) * 100)
            : 0,
          totalRevenue: stats.totalRevenue,
          totalPayouts: stats.totalPayouts,
          avgRating: stats.avgRating ? Math.round(stats.avgRating * 10) / 10 : 0,
        },
        jobsByStatus: statusCounts,
        jobsByCategory: categoryCounts,
        chartData,
        topWorkers,
        recentJobs: formattedRecentJobs,
        atRiskClients,
        period,
      },
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get analytics',
        },
      },
      { status: 500 }
    );
  }
}
