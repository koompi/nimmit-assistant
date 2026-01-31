"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Clock, Star, CreditCard, CheckCircle, Briefcase } from "lucide-react";

interface AnalyticsData {
  summary: {
    totalJobs: number;
    completedJobs: number;
    pendingJobs: number;
    inProgressJobs: number;
    cancelledJobs: number;
    completionRate: number;
    firstTimeApprovalRate: number;
    totalCreditsSpent: number;
    avgRating: number | null;
    totalRatings: number;
  };
  deliveryTime: {
    avgHours: number | null;
    minHours: number | null;
    maxHours: number | null;
  };
  byCategory: Array<{ _id: string; count: number; creditsSpent: number }>;
  byMonth: Array<{ month: string; jobs: number; completed: number; creditsSpent: number }>;
  recentJobs: Array<{
    _id: string;
    title: string;
    status: string;
    category: string;
    priority: string;
    rating?: number;
    createdAt: string;
    completedAt?: string;
    creditsCharged?: number;
  }>;
}

const statusColors: Record<string, string> = {
  pending: "bg-[var(--nimmit-warning-bg)] text-[var(--nimmit-warning)]",
  assigned: "bg-[var(--nimmit-info-bg)] text-[var(--nimmit-info)]",
  in_progress: "bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)]",
  review: "bg-[var(--nimmit-info-bg)] text-[var(--nimmit-info)]",
  revision: "bg-[var(--nimmit-error-bg)] text-[var(--nimmit-error)]",
  completed: "bg-[var(--nimmit-success-bg)] text-[var(--nimmit-success)]",
  cancelled: "bg-[var(--nimmit-text-tertiary)]/10 text-[var(--nimmit-text-tertiary)]",
};

const categoryLabels: Record<string, string> = {
  video: "Video",
  design: "Design",
  web: "Web",
  social: "Social",
  admin: "Admin",
  other: "Other",
};

export default function ClientAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch("/api/analytics/client");
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
            Analytics
          </h1>
          <p className="text-[var(--nimmit-text-secondary)] mt-1">
            Your job performance and spending insights
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-up stagger-1">
          <StatCard
            icon={<Briefcase className="h-5 w-5" />}
            label="Total Jobs"
            value={data.summary.totalJobs}
            subtext={`${data.summary.completedJobs} completed`}
            color="accent-primary"
          />
          <StatCard
            icon={<CheckCircle className="h-5 w-5" />}
            label="Completion Rate"
            value={`${data.summary.completionRate}%`}
            subtext={`${data.summary.firstTimeApprovalRate}% first-time approval`}
            color="success"
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Avg Delivery"
            value={data.deliveryTime.avgHours ? `${data.deliveryTime.avgHours}h` : "—"}
            subtext={data.deliveryTime.minHours ? `${data.deliveryTime.minHours}h - ${data.deliveryTime.maxHours}h` : "No data yet"}
            color="info"
          />
          <StatCard
            icon={<Star className="h-5 w-5" />}
            label="Avg Rating"
            value={data.summary.avgRating ? `${data.summary.avgRating}` : "—"}
            subtext={`${data.summary.totalRatings} ratings given`}
            color="warning"
          />
        </div>

        {/* Credits Card */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[var(--nimmit-accent-primary)]" />
              Credits Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-display font-semibold text-[var(--nimmit-text-primary)]">
                {data.summary.totalCreditsSpent}
              </span>
              <span className="text-[var(--nimmit-text-secondary)]">credits total</span>
            </div>
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* By Category */}
          <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-3">
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
                      <span className="text-xs text-[var(--nimmit-text-tertiary)] ml-2">{cat.creditsSpent} credits</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Monthly Trend */}
          <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[var(--nimmit-accent-secondary)]" />
                Monthly Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.byMonth.length === 0 ? (
                <p className="text-[var(--nimmit-text-tertiary)] text-center py-4">No data yet</p>
              ) : (
                data.byMonth.map((month) => (
                  <div key={month.month} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--nimmit-text-secondary)]">{month.month}</span>
                    <div className="flex items-center gap-4 text-right">
                      <span className="text-sm font-medium text-[var(--nimmit-text-primary)]">{month.jobs} jobs</span>
                      <span className="text-xs text-[var(--nimmit-success)]">{month.completed} done</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Jobs */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-5">
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
                    href={`/client/jobs/${job._id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-[var(--nimmit-border)] hover:bg-[var(--nimmit-bg-secondary)] transition-colors"
                  >
                    <div>
                      <p className="font-medium text-[var(--nimmit-text-primary)]">{job.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-xs ${statusColors[job.status]}`}>
                          {job.status.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-[var(--nimmit-text-tertiary)]">
                          {categoryLabels[job.category] || job.category}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {job.rating && (
                        <div className="flex items-center gap-1 text-[var(--nimmit-warning)]">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="text-sm">{job.rating}</span>
                        </div>
                      )}
                      {job.creditsCharged && (
                        <span className="text-xs text-[var(--nimmit-text-tertiary)]">{job.creditsCharged} credits</span>
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
