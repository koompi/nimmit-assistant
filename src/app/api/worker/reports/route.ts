// Worker Performance Reports API
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/connection';
import { Job, User } from '@/lib/db/models';

interface PeriodStats {
  period: string;
  startDate: Date;
  endDate: Date;
  jobsCompleted: number;
  jobsInProgress: number;
  totalEarnings: number;
  avgRating: number;
  ratingCount: number;
  avgCompletionTime: number; // in hours
  onTimeRate: number; // percentage
  revisionRate: number; // percentage
  topCategories: { category: string; count: number }[];
  topSkills: { skill: string; count: number }[];
}

/**
 * GET /api/worker/reports
 * Get worker performance reports
 *
 * Query params:
 * - period: 'week' | 'month' | 'quarter' | 'year' (default: 'month')
 * - count: Number of periods to return (default: 6)
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

    if (session.user.role !== 'worker') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Worker access required' } },
        { status: 403 }
      );
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'month';
    const count = Math.min(parseInt(searchParams.get('count') || '6', 10), 12);

    const workerId = session.user.id;

    // Get worker info
    const worker = await User.findById(workerId).select('profile workerProfile');
    if (!worker) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Worker not found' } },
        { status: 404 }
      );
    }

    // Calculate period ranges
    const periods = getPeriodRanges(period, count);
    const reports: PeriodStats[] = [];

    for (const p of periods) {
      const stats = await calculatePeriodStats(workerId, p.startDate, p.endDate, p.label);
      reports.push(stats);
    }

    // Get overall stats
    const overallStats = await calculateOverallStats(workerId);

    // Get comparison with previous period
    const currentPeriod = reports[0];
    const previousPeriod = reports[1];
    const comparison = previousPeriod ? {
      jobsChange: currentPeriod.jobsCompleted - previousPeriod.jobsCompleted,
      earningsChange: currentPeriod.totalEarnings - previousPeriod.totalEarnings,
      ratingChange: currentPeriod.avgRating - previousPeriod.avgRating,
    } : null;

    return NextResponse.json({
      success: true,
      data: {
        worker: {
          name: `${worker.profile.firstName} ${worker.profile.lastName}`,
          skills: worker.workerProfile?.skills || [],
          totalEarnings: worker.workerProfile?.stats?.totalEarnings || 0,
          avgRating: worker.workerProfile?.stats?.avgRating || 0,
          completedJobs: worker.workerProfile?.stats?.completedJobs || 0,
        },
        currentPeriod,
        comparison,
        reports,
        overall: overallStats,
      },
    });
  } catch (error) {
    console.error('Get worker reports error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get reports',
        },
      },
      { status: 500 }
    );
  }
}

function getPeriodRanges(period: string, count: number): { label: string; startDate: Date; endDate: Date }[] {
  const ranges: { label: string; startDate: Date; endDate: Date }[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    let startDate: Date;
    let endDate: Date;
    let label: string;

    switch (period) {
      case 'week': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() - (i * 7));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        startDate = weekStart;
        endDate = weekEnd;
        label = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        break;
      }
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3) - i;
        const year = now.getFullYear() + Math.floor(quarter / 4);
        const q = ((quarter % 4) + 4) % 4;
        startDate = new Date(year, q * 3, 1);
        endDate = new Date(year, q * 3 + 3, 0, 23, 59, 59, 999);
        label = `Q${q + 1} ${year}`;
        break;
      }
      case 'year': {
        const y = now.getFullYear() - i;
        startDate = new Date(y, 0, 1);
        endDate = new Date(y, 11, 31, 23, 59, 59, 999);
        label = `${y}`;
        break;
      }
      case 'month':
      default: {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        startDate = monthDate;
        endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
        label = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        break;
      }
    }

    ranges.push({ label, startDate, endDate });
  }

  return ranges;
}

async function calculatePeriodStats(
  workerId: string,
  startDate: Date,
  endDate: Date,
  label: string
): Promise<PeriodStats> {
  // Get completed jobs in period
  const completedJobs = await Job.find({
    workerId,
    status: 'completed',
    completedAt: { $gte: startDate, $lte: endDate },
  }).lean();

  // Get in-progress jobs
  const inProgressJobs = await Job.countDocuments({
    workerId,
    status: { $in: ['assigned', 'in_progress', 'review'] },
    assignedAt: { $gte: startDate, $lte: endDate },
  });

  // Calculate metrics
  const totalEarnings = completedJobs.reduce((sum, job) => sum + (job.workerEarnings || 0), 0);

  const ratings = completedJobs.filter(job => job.rating).map(job => job.rating!);
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
    : 0;

  // Calculate average completion time
  const completionTimes = completedJobs
    .filter(job => job.startedAt && job.completedAt)
    .map(job => (job.completedAt!.getTime() - job.startedAt!.getTime()) / (1000 * 60 * 60));
  const avgCompletionTime = completionTimes.length > 0
    ? completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length
    : 0;

  // Calculate on-time rate (completed before or on due date)
  const jobsWithDueDate = completedJobs.filter(job => job.dueDate);
  const onTimeJobs = jobsWithDueDate.filter(
    job => job.completedAt && job.completedAt <= job.dueDate!
  );
  const onTimeRate = jobsWithDueDate.length > 0
    ? (onTimeJobs.length / jobsWithDueDate.length) * 100
    : 100;

  // Calculate revision rate
  const jobsWithRevision = completedJobs.filter(
    job => job.progressUpdates?.some(u => u.content.toLowerCase().includes('revision'))
  );
  const revisionRate = completedJobs.length > 0
    ? (jobsWithRevision.length / completedJobs.length) * 100
    : 0;

  // Get top categories
  const categoryCounts: Record<string, number> = {};
  completedJobs.forEach(job => {
    categoryCounts[job.category] = (categoryCounts[job.category] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Get top skills used
  const skillCounts: Record<string, number> = {};
  completedJobs.forEach(job => {
    (job.aiAnalysis?.requiredSkills || []).forEach(skill => {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    });
  });
  const topSkills = Object.entries(skillCounts)
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    period: label,
    startDate,
    endDate,
    jobsCompleted: completedJobs.length,
    jobsInProgress: inProgressJobs,
    totalEarnings,
    avgRating: Math.round(avgRating * 10) / 10,
    ratingCount: ratings.length,
    avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
    onTimeRate: Math.round(onTimeRate),
    revisionRate: Math.round(revisionRate),
    topCategories,
    topSkills,
  };
}

async function calculateOverallStats(workerId: string) {
  const allCompletedJobs = await Job.find({
    workerId,
    status: 'completed',
  }).lean();

  const totalJobs = allCompletedJobs.length;
  const totalEarnings = allCompletedJobs.reduce((sum, job) => sum + (job.workerEarnings || 0), 0);

  const ratings = allCompletedJobs.filter(job => job.rating).map(job => job.rating!);
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
    : 0;

  // Rating distribution
  const ratingDistribution = [0, 0, 0, 0, 0]; // 1-5 stars
  ratings.forEach(r => {
    ratingDistribution[Math.round(r) - 1]++;
  });

  // Jobs by category
  const categoryCounts: Record<string, number> = {};
  allCompletedJobs.forEach(job => {
    categoryCounts[job.category] = (categoryCounts[job.category] || 0) + 1;
  });

  return {
    totalJobs,
    totalEarnings,
    avgRating: Math.round(avgRating * 10) / 10,
    totalRatings: ratings.length,
    ratingDistribution,
    jobsByCategory: Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / totalJobs) * 100),
    })),
  };
}
