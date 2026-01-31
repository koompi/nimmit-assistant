"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Clock, Star, DollarSign, CheckCircle, Briefcase, Zap } from "lucide-react";

interface AnalyticsData {
  summary: {
    totalJobs: number;
    completedJobs: number;
    activeJobs: number;
    completionRate: number;
    avgRating: number | null;
    ratingCount: number;
  };
  earnings: {
    totalEarnings: number;
    paidEarnings: number;
    pendingEarnings: number;
  };
  performance: {
    avgCompletionHours: number | null;
    onTimeRate: number;
    fiveStarRate: number;
  };
  ratingDistribution: Array<{ _id: number; count: number }>;
  byCategory: Array<{ _id: string; count: number; completed: number; earnings: number }>;
  earningsByMonth: Array<{ month: string; jobsCompleted: number; earnings: number; avgRating: number | null }>;
  recentJobs: Array<{
    _id: string;
    title: string;
    status: string;
    category: string;
    priority: string;
    rating?: number;
    workerEarnings?: number;
    createdAt: string;
    completedAt?: string;
    clientName?: string;
  }>;
}

const statusColors: Record<string, string> = {
  assigned: "bg-[var(--nimmit-info-bg)] text-[var(--nimmit-info)]",
  in_progress: "bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)]",
  review: "bg-[var(--nimmit-info-bg)] text-[var(--nimmit-info)]",
  revision: "bg-[var(--nimmit-error-bg)] text-[var(--nimmit-error)]",
  completed: "bg-[var(--nimmit-success-bg)] text-[var(--nimmit-success)]",
};

const categoryLabels: Record<string, string> = {
  video: "Video",
  design: "Design",
  web: "Web",
  social: "Social",
  admin: "Admin",
  other: "Other",
};

export default function WorkerAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch("/api/analytics/worker");
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || "Failed to load analytics");
        }
      } catch {
        setError("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--nimmit-bg-primary)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--nimmit-accent-primary)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--nimmit-bg-primary)] flex items-center justify-center">
        <p className="text-[var(--nimmit-error)]">{error || "Failed to load"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--nimmit-bg-primary)]">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="text-2xl md:text-3xl font-display font-semibold text-[var(--nimmit-text-primary)]">
            Performance Dashboard
          </h1>
          <p className="text-[var(--nimmit-text-secondary)] mt-1">
            Your job stats, earnings, and performance metrics
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-up stagger-1">
          <StatCard
            icon={<Briefcase className="h-5 w-5" />}
            label="Jobs Completed"
            value={data.summary.completedJobs}
            subtext={`${data.summary.activeJobs} active`}
            color="accent-primary"
          />
          <StatCard
            icon={<Star className="h-5 w-5" />}
            label="Avg Rating"
            value={data.summary.avgRating ? `${data.summary.avgRating}` : "—"}
            subtext={`${data.summary.ratingCount} ratings`}
            color="warning"
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Avg Completion"
            value={data.performance.avgCompletionHours ? `${data.performance.avgCompletionHours}h` : "—"}
            subtext={`${data.performance.onTimeRate}% on-time`}
            color="info"
          />
          <StatCard
            icon={<Zap className="h-5 w-5" />}
            label="5-Star Rate"
            value={`${data.performance.fiveStarRate}%`}
            subtext="of rated jobs"
            color="success"
          />
        </div>

        {/* Earnings Cards */}
        <div className="grid gap-4 md:grid-cols-3 animate-fade-up stagger-2">
          <Card className="border-[var(--nimmit-success)]/30 bg-[var(--nimmit-success-bg)]/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-[var(--nimmit-success)]" />
                <span className="text-sm text-[var(--nimmit-success)]">Total Earnings</span>
              </div>
              <p className="text-3xl font-display font-semibold text-[var(--nimmit-success)]">
                ${data.earnings.totalEarnings.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-[var(--nimmit-border)]">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-[var(--nimmit-text-secondary)]" />
                <span className="text-sm text-[var(--nimmit-text-secondary)]">Paid</span>
              </div>
              <p className="text-3xl font-display font-semibold text-[var(--nimmit-text-primary)]">
                ${data.earnings.paidEarnings.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-[var(--nimmit-warning)]/30 bg-[var(--nimmit-warning-bg)]/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-[var(--nimmit-warning)]" />
                <span className="text-sm text-[var(--nimmit-warning)]">Pending Payout</span>
              </div>
              <p className="text-3xl font-display font-semibold text-[var(--nimmit-warning)]">
                ${data.earnings.pendingEarnings.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Rating Distribution */}
          <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Star className="h-5 w-5 text-[var(--nimmit-warning)]" />
                Rating Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.ratingDistribution.length === 0 ? (
                <p className="text-[var(--nimmit-text-tertiary)] text-center py-4">No ratings yet</p>
              ) : (
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const ratingData = data.ratingDistribution.find((r) => r._id === rating);
                    const count = ratingData?.count || 0;
                    const total = data.ratingDistribution.reduce((sum, r) => sum + r.count, 0);
                    const percentage = total > 0 ? (count / total) * 100 : 0;

                    return (
                      <div key={rating} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-12">
                          <span className="text-sm font-medium">{rating}</span>
                          <Star className="h-3 w-3 fill-[var(--nimmit-warning)] text-[var(--nimmit-warning)]" />
                        </div>
                        <div className="flex-1 h-2 bg-[var(--nimmit-bg-secondary)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--nimmit-warning)] transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--nimmit-text-tertiary)] w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* By Category */}
          <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display">Jobs by Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.byCategory.length === 0 ? (
                <p className="text-[var(--nimmit-text-tertiary)] text-center py-4">No data yet</p>
              ) : (
                data.byCategory.map((cat) => (
                  <div key={cat._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-[var(--nimmit-accent-primary)]" />
                      <span className="text-sm font-medium text-[var(--nimmit-text-primary)]">
                        {categoryLabels[cat._id] || cat._id}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-[var(--nimmit-text-primary)]">{cat.count}</span>
                      <span className="text-xs text-[var(--nimmit-success)] ml-2">${cat.earnings.toFixed(0)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--nimmit-accent-secondary)]" />
              Monthly Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.earningsByMonth.length === 0 ? (
              <p className="text-[var(--nimmit-text-tertiary)] text-center py-4">No data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--nimmit-border)]">
                      <th className="text-left py-2 font-medium text-[var(--nimmit-text-secondary)]">Month</th>
                      <th className="text-center py-2 font-medium text-[var(--nimmit-text-secondary)]">Jobs</th>
                      <th className="text-center py-2 font-medium text-[var(--nimmit-text-secondary)]">Rating</th>
                      <th className="text-right py-2 font-medium text-[var(--nimmit-text-secondary)]">Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.earningsByMonth.map((month) => (
                      <tr key={month.month} className="border-b border-[var(--nimmit-border)]/50">
                        <td className="py-2 text-[var(--nimmit-text-primary)]">{month.month}</td>
                        <td className="py-2 text-center text-[var(--nimmit-text-primary)]">{month.jobsCompleted}</td>
                        <td className="py-2 text-center">
                          {month.avgRating ? (
                            <span className="flex items-center justify-center gap-1 text-[var(--nimmit-warning)]">
                              <Star className="h-3 w-3 fill-current" />
                              {month.avgRating}
                            </span>
                          ) : (
                            <span className="text-[var(--nimmit-text-tertiary)]">—</span>
                          )}
                        </td>
                        <td className="py-2 text-right font-medium text-[var(--nimmit-success)]">
                          ${month.earnings.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display">Recent Jobs</CardTitle>
            <CardDescription>Your latest task activity</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentJobs.length === 0 ? (
              <p className="text-[var(--nimmit-text-tertiary)] text-center py-8">No jobs yet</p>
            ) : (
              <div className="space-y-3">
                {data.recentJobs.map((job) => (
                  <Link
                    key={job._id}
                    href={`/worker/jobs/${job._id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-[var(--nimmit-border)] hover:bg-[var(--nimmit-bg-secondary)] transition-colors"
                  >
                    <div>
                      <p className="font-medium text-[var(--nimmit-text-primary)]">{job.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-xs ${statusColors[job.status]}`}>
                          {job.status.replace("_", " ")}
                        </Badge>
                        {job.clientName && (
                          <span className="text-xs text-[var(--nimmit-text-tertiary)]">
                            {job.clientName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {job.rating && (
                        <div className="flex items-center gap-1 text-[var(--nimmit-warning)]">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="text-sm">{job.rating}</span>
                        </div>
                      )}
                      {job.workerEarnings !== undefined && (
                        <span className="text-xs text-[var(--nimmit-success)]">${job.workerEarnings.toFixed(2)}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
  color: string;
}) {
  const colorClass = {
    "accent-primary": "text-[var(--nimmit-accent-primary)]",
    success: "text-[var(--nimmit-success)]",
    info: "text-[var(--nimmit-info)]",
    warning: "text-[var(--nimmit-warning)]",
  }[color] || "text-[var(--nimmit-text-primary)]";

  return (
    <Card className="border-[var(--nimmit-border)] shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-2">
          <div className={colorClass}>{icon}</div>
          <span className="text-sm text-[var(--nimmit-text-secondary)]">{label}</span>
        </div>
        <p className="text-2xl font-display font-semibold text-[var(--nimmit-text-primary)]">{value}</p>
        <p className="text-xs text-[var(--nimmit-text-tertiary)] mt-1">{subtext}</p>
      </CardContent>
    </Card>
  );
}
