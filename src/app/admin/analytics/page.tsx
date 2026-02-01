"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Briefcase,
  DollarSign,
  Star,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";

// ... Interfaces (kept same for brevity but useful to have)
interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalClients: number;
    totalWorkers: number;
    activeWorkers: number;
    totalJobs: number;
    completedJobs: number;
    completionRate: number;
    totalRevenue: number;
    totalPayouts: number;
    avgRating: number;
  };
  jobsByStatus: Record<string, number>;
  jobsByCategory: Record<string, number>;
  chartData: { date: string; jobs: number; revenue: number }[];
  topWorkers: {
    _id: string;
    name: string;
    completedJobs: number;
    avgRating: number;
    totalEarnings: number;
    currentJobs: number;
  }[];
  recentJobs: {
    id: string;
    title: string;
    status: string;
    category: string;
    client: string;
    worker: string;
    createdAt: string;
  }[];
  atRiskClients: {
    name: string;
    email: string;
    lastJobDate: string | null;
    totalJobs: number;
  }[];
  period: string;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?period=${period}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  if (loading || !data) {
    return <DashboardSkeleton />;
  }

  const { overview, jobsByStatus, jobsByCategory, chartData, topWorkers, recentJobs, atRiskClients } = data;

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-semibold text-[var(--nimmit-text-primary)]">
            Analytics
          </h1>
          <p className="text-sm text-[var(--nimmit-text-tertiary)]">Platform performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px] h-8 text-xs border-[var(--nimmit-border)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchAnalytics} className="h-8 w-8 p-0">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Compact Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <CompactMetric label="Total Revenue" value={`$${(overview.totalRevenue * 49.9).toLocaleString()}`} sub="$12k paid out" icon={<DollarSign className="w-4 h-4" />} color="text-green-500" />
        <CompactMetric label="Active Jobs" value={overview.totalJobs} sub={`${overview.completionRate}% completion`} icon={<Briefcase className="w-4 h-4" />} color="text-blue-500" />
        <CompactMetric label="Total Users" value={overview.totalUsers} sub={`${overview.activeWorkers} active workers`} icon={<Users className="w-4 h-4" />} color="text-purple-500" />
        <CompactMetric label="Avg Rating" value={overview.avgRating.toFixed(1)} sub="Last 30 days" icon={<Star className="w-4 h-4" />} color="text-yellow-500" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-[var(--nimmit-bg-elevated)] rounded-lg border border-[var(--nimmit-border)] p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--nimmit-text-primary)]">Job Trends</h3>
            <div className="flex gap-2">
              <span className="flex items-center text-xs text-[var(--nimmit-text-tertiary)]"><span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span> Jobs</span>
              {/* <span className="flex items-center text-xs text-[var(--nimmit-text-tertiary)]"><span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span> Revenue</span> */}
            </div>
          </div>
          <SimpleBarChart data={chartData} dataKey="jobs" color="#3b82f6" height={160} />
        </div>

        {/* Status Breakdown */}
        <div className="bg-[var(--nimmit-bg-elevated)] rounded-lg border border-[var(--nimmit-border)] p-4">
          <h3 className="text-sm font-semibold text-[var(--nimmit-text-primary)] mb-3">Job Status</h3>
          <div className="space-y-2">
            {Object.entries(jobsByStatus).map(([status, count]) => (
              <StatusBar
                key={status}
                label={status.replace("_", " ")}
                value={count}
                total={overview.totalJobs}
                color={getStatusColor(status)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Workers List */}
        <div className="bg-[var(--nimmit-bg-elevated)] rounded-lg border border-[var(--nimmit-border)]">
          <div className="px-4 py-3 border-b border-[var(--nimmit-border)] flex justify-between items-center">
            <h3 className="text-sm font-semibold text-[var(--nimmit-text-primary)]">Top Workers</h3>
          </div>
          <div className="text-xs">
            {topWorkers.slice(0, 5).map((worker, i) => (
              <div key={worker._id} className="flex items-center justify-between px-4 py-2 border-b border-[var(--nimmit-border)] last:border-0 hover:bg-[var(--nimmit-bg-secondary)]">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--nimmit-text-tertiary)] font-mono w-3">{i + 1}</span>
                  <div>
                    <div className="font-medium text-[var(--nimmit-text-primary)]">{worker.name}</div>
                    <div className="text-[10px] text-[var(--nimmit-text-tertiary)]">{worker.completedJobs} jobs · ${worker.totalEarnings} earned</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium flex items-center justify-end gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" /> {worker.avgRating.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="bg-[var(--nimmit-bg-elevated)] rounded-lg border border-[var(--nimmit-border)]">
          <div className="px-4 py-3 border-b border-[var(--nimmit-border)] flex justify-between items-center">
            <h3 className="text-sm font-semibold text-[var(--nimmit-text-primary)]">Recent Jobs</h3>
          </div>
          <div className="text-xs">
            {recentJobs.slice(0, 5).map((job) => (
              <div key={job.id} className="flex items-center justify-between px-4 py-2 border-b border-[var(--nimmit-border)] last:border-0 hover:bg-[var(--nimmit-bg-secondary)]">
                <div className="min-w-0 flex-1 pr-4">
                  <div className="font-medium text-[var(--nimmit-text-primary)] truncate">{job.title}</div>
                  <div className="text-[10px] text-[var(--nimmit-text-tertiary)]">
                    {job.client} • {job.category}
                  </div>
                </div>
                <Badge variant={getStatusVariant(job.status) === 'default' ? 'default' : 'outline'} className={`h-5 px-1.5 text-[10px] font-normal`}>
                  {job.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

// Compact Components
function CompactMetric({ label, value, sub, icon, color }: { label: string; value: string | number; sub: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-[var(--nimmit-bg-elevated)] border border-[var(--nimmit-border)] rounded-lg p-3 flex flex-col justify-between">
      <div className={`flex items-start justify-between mb-1 ${color}`}>
        {icon}
        <span className="text-[10px] font-medium text-[var(--nimmit-text-tertiary)] uppercase">{label}</span>
      </div>
      <div>
        <div className="text-lg font-bold text-[var(--nimmit-text-primary)]">{value}</div>
        <div className="text-[10px] text-[var(--nimmit-text-tertiary)]">{sub}</div>
      </div>
    </div>
  );
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="w-24 truncate text-[var(--nimmit-text-secondary)] capitalize">{label}</div>
      <div className="flex-1 h-1.5 bg-[var(--nimmit-bg-secondary)] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }} />
      </div>
      <div className="w-8 text-right font-medium text-[var(--nimmit-text-primary)]">{value}</div>
    </div>
  );
}

function SimpleBarChart({ data, dataKey, color, height = 160 }: { data: any[]; dataKey: string; color: string; height?: number }) {
  if (data.length === 0) return <div className={`flex items-center justify-center text-xs text-muted-foreground`} style={{ height }}>No data</div>;
  const maxValue = Math.max(...data.map((d) => Number(d[dataKey]) || 0));

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((item, i) => {
        const value = Number(item[dataKey]) || 0;
        const h = maxValue > 0 ? (value / maxValue) * 100 : 0;
        return (
          <div key={i} className="flex-1 group relative flex flex-col justify-end h-full">
            <div className="w-full rounded-sm transition-opacity group-hover:opacity-80 min-h-[2px]" style={{ height: `${h}%`, backgroundColor: color }} />
            {/* Tooltip could go here */}
          </div>
        );
      })}
    </div>
  );
}

function DashboardSkeleton() {
  return <div className="p-4 animate-pulse">Loading analytics...</div>;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "#f59e0b",
    assigned: "#3b82f6",
    in_progress: "#8b5cf6",
    review: "#06b6d4",
    revision: "#f97316",
    completed: "#22c55e",
    cancelled: "#ef4444",
  };
  return colors[status] || "#6b7280";
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "cancelled") return "destructive";
  return "secondary";
}
