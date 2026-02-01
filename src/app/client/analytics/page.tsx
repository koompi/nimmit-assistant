"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, Star, CreditCard, CheckCircle, Briefcase } from "lucide-react";

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
  pending: "bg-[var(--nimmit-warning)]/10 text-[var(--nimmit-warning)]",
  assigned: "bg-[var(--nimmit-info)]/10 text-[var(--nimmit-info)]",
  in_progress: "bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)]",
  review: "bg-[var(--nimmit-info)]/10 text-[var(--nimmit-info)]",
  revision: "bg-[var(--nimmit-error)]/10 text-[var(--nimmit-error)]",
  completed: "bg-[var(--nimmit-success)]/10 text-[var(--nimmit-success)]",
  cancelled: "bg-[var(--nimmit-text-tertiary)]/10 text-[var(--nimmit-text-tertiary)]",
};

export default function ClientAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch("/api/analytics/client");
        const result = await response.json();
        if (result.success) setData(result.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading || !data) return <div className="p-8 text-center text-sm">Loading analytics...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-display font-semibold text-[var(--nimmit-text-primary)]">
          Performance & Insights
        </h1>
        <p className="text-sm text-[var(--nimmit-text-tertiary)]">Track your job success and spending</p>
      </div>

      {/* Compact Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Credits Spent */}
        <div className="bg-[var(--nimmit-bg-elevated)] border border-[var(--nimmit-border)] p-3 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-semibold text-[var(--nimmit-text-tertiary)]">Credits Spent</p>
            <p className="text-xl font-bold text-[var(--nimmit-primary)]">{data.summary.totalCreditsSpent}</p>
          </div>
          <div className="p-2 bg-[var(--nimmit-accent-primary)]/10 rounded-md text-[var(--nimmit-accent-primary)]">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-[var(--nimmit-bg-elevated)] border border-[var(--nimmit-border)] p-3 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-semibold text-[var(--nimmit-text-tertiary)]">Success Rate</p>
            <p className="text-xl font-bold text-[var(--nimmit-success)]">{data.summary.completionRate}%</p>
          </div>
          <div className="p-2 bg-[var(--nimmit-success)]/10 rounded-md text-[var(--nimmit-success)]">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>

        {/* Avg Time */}
        <div className="bg-[var(--nimmit-bg-elevated)] border border-[var(--nimmit-border)] p-3 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-semibold text-[var(--nimmit-text-tertiary)]">Avg Turnaround</p>
            <p className="text-xl font-bold text-[var(--nimmit-info)]">{data.deliveryTime.avgHours || 0}h</p>
          </div>
          <div className="p-2 bg-[var(--nimmit-info)]/10 rounded-md text-[var(--nimmit-info)]">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* Rating */}
        <div className="bg-[var(--nimmit-bg-elevated)] border border-[var(--nimmit-border)] p-3 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-semibold text-[var(--nimmit-text-tertiary)]">Avg Rating</p>
            <p className="text-xl font-bold text-[var(--nimmit-warning)]">{data.summary.avgRating || "-"}</p>
          </div>
          <div className="p-2 bg-[var(--nimmit-warning)]/10 rounded-md text-[var(--nimmit-warning)]">
            <Star className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Category Breakdown (List) */}
        <Card className="border-[var(--nimmit-border)] shadow-sm">
          <CardHeader className="py-3 px-4 border-b border-[var(--nimmit-border)]">
            <CardTitle className="text-sm font-semibold">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.byCategory.map((cat, i) => (
              <div key={cat._id} className="flex items-center justify-between px-4 py-2 border-b border-[var(--nimmit-border)] last:border-0 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--nimmit-accent-primary)] opcity-80" />
                  <span className="capitalize">{cat._id}</span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="font-medium">{cat.count} jobs</span>
                  <span className="text-[var(--nimmit-text-tertiary)]">{cat.creditsSpent} cr</span>
                </div>
              </div>
            ))}
            {data.byCategory.length === 0 && <div className="p-4 text-center text-xs text-[var(--nimmit-text-tertiary)]">No data</div>}
          </CardContent>
        </Card>

        {/* Monthly Trend (Simple List) */}
        <Card className="border-[var(--nimmit-border)] shadow-sm">
          <CardHeader className="py-3 px-4 border-b border-[var(--nimmit-border)]">
            <CardTitle className="text-sm font-semibold">Monthly Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-4 py-2 grid grid-cols-3 text-[10px] font-semibold text-[var(--nimmit-text-tertiary)] uppercase">
              <span>Month</span>
              <span className="text-center">Jobs</span>
              <span className="text-right">Completed</span>
            </div>
            {data.byMonth.map((m) => (
              <div key={m.month} className="px-4 py-2 border-b border-[var(--nimmit-border)] last:border-0 grid grid-cols-3 text-sm">
                <span className="font-medium">{m.month}</span>
                <span className="text-center text-[var(--nimmit-text-secondary)]">{m.jobs}</span>
                <span className="text-right text-[var(--nimmit-success)]">{m.completed}</span>
              </div>
            ))}
            {data.byMonth.length === 0 && <div className="p-4 text-center text-xs text-[var(--nimmit-text-tertiary)]">No data</div>}
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs Table */}
      <Card className="border-[var(--nimmit-border)] shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-[var(--nimmit-border)]">
          <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentJobs.map((job) => (
            <div key={job._id} className="flex items-center justify-between px-4 py-2 border-b border-[var(--nimmit-border)] last:border-0 hover:bg-[var(--nimmit-bg-secondary)] text-sm">
              <div className="flex-1 min-w-0 pr-4">
                <Link href={`/client/jobs/${job._id}`} className="font-medium text-[var(--nimmit-text-primary)] hover:underline truncate block">
                  {job.title}
                </Link>
                <div className="text-xs text-[var(--nimmit-text-tertiary)]">{job.category} • {new Date(job.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3">
                {job.rating && <div className="text-xs font-medium text-[var(--nimmit-warning)] flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> {job.rating}</div>}
                <Badge className={`h-5 px-1.5 text-[10px] font-normal border-0 ${statusColors[job.status]}`}>
                  {job.status.replace("_", " ")}
                </Badge>
              </div>
            </div>
          ))}
          {data.recentJobs.length === 0 && <div className="p-4 text-center text-xs text-[var(--nimmit-text-tertiary)]">No recent activity</div>}
        </CardContent>
      </Card>

    </div>
  );
}
