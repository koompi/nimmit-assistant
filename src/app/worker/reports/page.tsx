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
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Star,
  Briefcase,
  Clock,
  RefreshCw,
  Download,
} from "lucide-react";

interface PeriodStats {
  period: string;
  startDate: string;
  endDate: string;
  jobsCompleted: number;
  jobsInProgress: number;
  totalEarnings: number;
  avgRating: number;
  ratingCount: number;
  avgCompletionTime: number;
  onTimeRate: number;
  revisionRate: number;
  topCategories: { category: string; count: number }[];
  topSkills: { skill: string; count: number }[];
}

interface ReportData {
  worker: {
    name: string;
    skills: string[];
    totalEarnings: number;
    avgRating: number;
    completedJobs: number;
  };
  currentPeriod: PeriodStats;
  comparison: {
    jobsChange: number;
    earningsChange: number;
    ratingChange: number;
  } | null;
  reports: PeriodStats[];
  overall: {
    totalJobs: number;
    totalEarnings: number;
    avgRating: number;
    totalRatings: number;
    ratingDistribution: number[];
    jobsByCategory: { category: string; count: number; percentage: number }[];
  };
}

export default function WorkerReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/worker/reports?period=${period}&count=6`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period]);

  if (loading || !data) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { worker, currentPeriod, comparison, reports, overall } = data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance Reports</h1>
          <p className="text-muted-foreground">Your performance metrics and earnings</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="quarter">Quarterly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchReports}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="print:hidden"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Current Period Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Jobs Completed"
          value={currentPeriod.jobsCompleted}
          change={comparison?.jobsChange}
          icon={<Briefcase className="h-5 w-5" />}
          subtitle={`${currentPeriod.jobsInProgress} in progress`}
        />
        <StatCard
          title="Earnings"
          value={`$${currentPeriod.totalEarnings.toFixed(2)}`}
          change={comparison?.earningsChange}
          changePrefix="$"
          icon={<DollarSign className="h-5 w-5" />}
          subtitle={`$${overall.totalEarnings.toFixed(2)} all-time`}
        />
        <StatCard
          title="Avg Rating"
          value={currentPeriod.avgRating.toFixed(1)}
          change={comparison?.ratingChange}
          icon={<Star className="h-5 w-5" />}
          subtitle={`${currentPeriod.ratingCount} ratings this period`}
        />
        <StatCard
          title="Avg Completion"
          value={`${currentPeriod.avgCompletionTime.toFixed(1)}h`}
          icon={<Clock className="h-5 w-5" />}
          subtitle={`${currentPeriod.onTimeRate}% on-time`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Jobs Completed</CardTitle>
            <CardDescription>Jobs completed per {period}</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={reports.slice().reverse()}
              labelKey="period"
              valueKey="jobsCompleted"
              color="#3b82f6"
            />
          </CardContent>
        </Card>

        {/* Earnings Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Earnings</CardTitle>
            <CardDescription>Earnings per {period}</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={reports.slice().reverse()}
              labelKey="period"
              valueKey="totalEarnings"
              color="#22c55e"
              formatValue={(v) => `$${v.toFixed(0)}`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Details Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
            <CardDescription>All-time ratings breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = overall.ratingDistribution[rating - 1];
                const percentage = overall.totalRatings > 0
                  ? (count / overall.totalRatings) * 100
                  : 0;
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <span className="text-sm w-12">{rating} star</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
            <CardDescription>This {period}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentPeriod.topCategories.length > 0 ? (
                currentPeriod.topCategories.map((cat, i) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-4">{i + 1}</span>
                      <span className="capitalize">{cat.category}</span>
                    </div>
                    <Badge variant="secondary">{cat.count}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No jobs this period
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Skills Used */}
        <Card>
          <CardHeader>
            <CardTitle>Top Skills Used</CardTitle>
            <CardDescription>This {period}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentPeriod.topSkills.length > 0 ? (
                currentPeriod.topSkills.map((skill, i) => (
                  <div key={skill.skill} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-4">{i + 1}</span>
                      <span className="capitalize">{skill.skill}</span>
                    </div>
                    <Badge variant="secondary">{skill.count}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No skills data
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All-Time Stats */}
      <Card>
        <CardHeader>
          <CardTitle>All-Time Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{overall.totalJobs}</p>
              <p className="text-sm text-muted-foreground">Jobs Completed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">${overall.totalEarnings.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Earnings</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{overall.avgRating.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Average Rating</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{overall.totalRatings}</p>
              <p className="text-sm text-muted-foreground">Total Ratings</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Components

function StatCard({
  title,
  value,
  change,
  changePrefix = "",
  icon,
  subtitle,
}: {
  title: string;
  value: string | number;
  change?: number;
  changePrefix?: string;
  icon: React.ReactNode;
  subtitle?: string;
}) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                {isPositive && <TrendingUp className="h-3 w-3 text-green-500" />}
                {isNegative && <TrendingDown className="h-3 w-3 text-red-500" />}
                {change === 0 && <Minus className="h-3 w-3 text-muted-foreground" />}
                <span
                  className={`text-xs ${
                    isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-muted-foreground"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {changePrefix}
                  {typeof change === "number" ? change.toFixed(change % 1 === 0 ? 0 : 2) : change}
                </span>
              </div>
            )}
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function SimpleBarChart({
  data,
  labelKey,
  valueKey,
  color,
  formatValue = (v: number) => v.toString(),
}: {
  data: PeriodStats[];
  labelKey: keyof PeriodStats;
  valueKey: keyof PeriodStats;
  color: string;
  formatValue?: (v: number) => string;
}) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  const values = data.map((d) => Number(d[valueKey]) || 0);
  const maxValue = Math.max(...values, 1);

  return (
    <div className="space-y-4">
      <div className="h-48 flex items-end gap-2">
        {data.map((item, i) => {
          const value = Number(item[valueKey]) || 0;
          const height = (value / maxValue) * 100;

          return (
            <div key={i} className="flex-1 flex flex-col items-center group">
              <div
                className="w-full rounded-t transition-all group-hover:opacity-80 relative"
                style={{
                  height: `${height}%`,
                  minHeight: value > 0 ? "4px" : "0",
                  backgroundColor: color,
                }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-popover border rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  {formatValue(value)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        {data.map((item, i) => (
          <div key={i} className="flex-1 text-center">
            <p className="text-xs text-muted-foreground truncate" title={String(item[labelKey])}>
              {String(item[labelKey]).split(" ")[0]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
