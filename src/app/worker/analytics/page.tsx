"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Clock, Star, BrainCircuit, CheckCircle } from "lucide-react";

interface WorkerAnalytics {
  stats: {
    totalJobs: number;
    completedJobs: number;
    completionRate: number;
    totalEarnings: number;
    avgRating: number;
    avgCompletionTime: number; // in hours
    onTimeRate: number;
  };
  earningsByMonth: Array<{ month: string; amount: number; jobs: number }>;
  performanceMetrics: {
    communication: number; // 1-5
    quality: number; // 1-5
    speed: number; // 1-5
    reliability: number; // 1-5
  };
  recentFeedback: Array<{
    jobId: string;
    jobTitle: string;
    rating: number;
    comment: string;
    date: string;
  }>;
}

export default function WorkerAnalyticsPage() {
  const [data, setData] = useState<WorkerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for now as API might not be fully ready
    // fetch("/api/worker/analytics").then...
    setTimeout(() => {
      setData({
        stats: {
          totalJobs: 45,
          completedJobs: 42,
          completionRate: 93,
          totalEarnings: 3150,
          avgRating: 4.8,
          avgCompletionTime: 26,
          onTimeRate: 98
        },
        earningsByMonth: [
          { month: "Jan", amount: 850, jobs: 12 },
          { month: "Feb", amount: 920, jobs: 13 },
          { month: "Mar", amount: 1380, jobs: 20 },
        ],
        performanceMetrics: {
          communication: 4.9,
          quality: 4.8,
          speed: 4.6,
          reliability: 5.0
        },
        recentFeedback: [
          { jobId: "1", jobTitle: "Logo Design for Startup", rating: 5, comment: "Excellent work, very fast!", date: "2024-03-20" },
          { jobId: "2", jobTitle: "Social Media Post", rating: 4, comment: "Good quality but slight delay.", date: "2024-03-15" },
        ]
      });
      setLoading(false);
    }, 500);
  }, []);

  if (loading || !data) return <div className="p-8 text-center text-sm">Loading analytics...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-display font-semibold text-[var(--nimmit-text-primary)]">
          My Performance
        </h1>
      </div>

      {/* Compact Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CompactStat label="Total Earnings" value={`$${data.stats.totalEarnings}`} icon={<DollarSign className="w-4 h-4" />} color="text-green-500" bg="bg-green-500/10" />
        <CompactStat label="Avg Rating" value={data.stats.avgRating} icon={<Star className="w-4 h-4" />} color="text-yellow-500" bg="bg-yellow-500/10" />
        <CompactStat label="Completion Rate" value={`${data.stats.completionRate}%`} icon={<CheckCircle className="w-4 h-4" />} color="text-blue-500" bg="bg-blue-500/10" />
        <CompactStat label="On-Time Delivery" value={`${data.stats.onTimeRate}%`} icon={<Clock className="w-4 h-4" />} color="text-purple-500" bg="bg-purple-500/10" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Performance Radar/List - Using List for simplicity & compactness */}
        <Card className="border-[var(--nimmit-border)] shadow-sm">
          <CardHeader className="py-3 px-4 border-b border-[var(--nimmit-border)]">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-[var(--nimmit-accent-primary)]" />
              Skill Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <SkillBar label="Communication" value={data.performanceMetrics.communication} />
            <SkillBar label="Quality of Work" value={data.performanceMetrics.quality} />
            <SkillBar label="Delivery Speed" value={data.performanceMetrics.speed} />
            <SkillBar label="Reliability" value={data.performanceMetrics.reliability} />
          </CardContent>
        </Card>

        {/* Earnings Trend */}
        <Card className="border-[var(--nimmit-border)] shadow-sm">
          <CardHeader className="py-3 px-4 border-b border-[var(--nimmit-border)]">
            <CardTitle className="text-sm font-semibold">Earnings History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-4 py-2 grid grid-cols-3 text-[10px] font-semibold text-[var(--nimmit-text-tertiary)] uppercase bg-[var(--nimmit-bg-secondary)]/30">
              <span>Month</span>
              <span className="text-center">Jobs</span>
              <span className="text-right">Earnings</span>
            </div>
            {data.earningsByMonth.map((m) => (
              <div key={m.month} className="px-4 py-2 border-b border-[var(--nimmit-border)] last:border-0 grid grid-cols-3 text-sm">
                <span className="font-medium">{m.month}</span>
                <span className="text-center text-[var(--nimmit-text-secondary)]">{m.jobs}</span>
                <span className="text-right font-medium text-[var(--nimmit-text-primary)]">${m.amount}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Feedback */}
      <Card className="border-[var(--nimmit-border)] shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-[var(--nimmit-border)]">
          <CardTitle className="text-sm font-semibold">Recent Feedback</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentFeedback.map((fb, i) => (
            <div key={i} className="px-4 py-3 border-b border-[var(--nimmit-border)] last:border-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-[var(--nimmit-text-primary)]">{fb.jobTitle}</span>
                <span className="text-xs text-[var(--nimmit-text-tertiary)]">{fb.date}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <p className="text-xs text-[var(--nimmit-text-secondary)] line-clamp-2">{fb.comment}</p>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                  <span className="text-xs font-bold text-[var(--nimmit-text-primary)]">{fb.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CompactStat({ label, value, icon, color, bg }: { label: string; value: string | number; icon: React.ReactNode; color: string; bg: string }) {
  return (
    <div className="bg-[var(--nimmit-bg-elevated)] border border-[var(--nimmit-border)] p-3 rounded-lg flex flex-col justify-between">
      <div className={`flex items-center justify-between`}>
        <span className="text-[10px] font-medium text-[var(--nimmit-text-tertiary)] uppercase">{label}</span>
        <div className={`p-1.5 rounded-md ${bg} ${color}`}>
          {icon}
        </div>
      </div>
      <div className="text-xl font-bold text-[var(--nimmit-text-primary)] mt-1">{value}</div>
    </div>
  );
}

function SkillBar({ label, value }: { label: string; value: number }) {
  const percentage = (value / 5) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--nimmit-text-secondary)]">{label}</span>
        <span className="font-medium text-[var(--nimmit-text-primary)]">{value}</span>
      </div>
      <div className="h-2 w-full bg-[var(--nimmit-bg-secondary)] rounded-full overflow-hidden">
        <div className="h-full bg-[var(--nimmit-accent-primary)] rounded-full" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
