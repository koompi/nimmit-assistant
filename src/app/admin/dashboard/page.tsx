"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Job } from "@/types";
import type { IUser } from "@/lib/db/models";

interface JobWithPopulated extends Omit<Job, "clientId" | "workerId"> {
  clientId: {
    _id: string;
    profile: { firstName: string; lastName: string };
    email: string;
  };
  workerId?: {
    _id: string;
    profile: { firstName: string; lastName: string };
    email: string;
  };
}

export default function AdminDashboard() {
  const [jobs, setJobs] = useState<JobWithPopulated[]>([]);
  const [workers, setWorkers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [jobsRes, workersRes] = await Promise.all([
          fetch("/api/jobs"),
          fetch("/api/users?role=worker"),
        ]);
        const [jobsData, workersData] = await Promise.all([
          jobsRes.json(),
          workersRes.json(),
        ]);
        if (jobsData.success) setJobs(jobsData.data.jobs);
        if (workersData.success) setWorkers(workersData.data);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const pendingJobs = jobs.filter((j) => j.status === "pending");
  const activeJobs = jobs.filter((j) =>
    ["assigned", "in_progress", "review", "revision"].includes(j.status)
  );
  const completedJobs = jobs.filter((j) => j.status === "completed");
  const availableWorkers = workers.filter(
    (w) => w.workerProfile?.availability === "available"
  );

  return (
    <div className="min-h-screen bg-[var(--nimmit-bg-primary)]">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-[var(--nimmit-text-primary)]">
            Admin Dashboard
          </h1>
          <p className="text-[var(--nimmit-text-secondary)] mt-2 text-lg">
            Manage jobs and team assignments.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            label="Unassigned"
            value={pendingJobs.length}
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />}
            color="warning"
            highlight={pendingJobs.length > 0}
            delay={0}
          />
          <StatsCard
            label="Active Jobs"
            value={activeJobs.length}
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />}
            color="primary"
            delay={1}
          />
          <StatsCard
            label="Available"
            value={availableWorkers.length}
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />}
            color="success"
            delay={2}
          />
          <StatsCard
            label="Completed"
            value={completedJobs.length}
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
            color="tertiary"
            delay={3}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Unassigned Jobs Queue */}
          <Card className={`border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-4 ${pendingJobs.length > 0 ? "border-[var(--nimmit-warning)]/30" : ""}`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {pendingJobs.length > 0 && (
                    <div className="w-2 h-2 rounded-full bg-[var(--nimmit-warning)] animate-pulse" />
                  )}
                  <div>
                    <CardTitle className="text-lg font-display">Unassigned Jobs</CardTitle>
                    <CardDescription>Jobs waiting for assignment</CardDescription>
                  </div>
                </div>
                <Link href="/admin/jobs">
                  <Button variant="outline" size="sm" className="border-[var(--nimmit-border)]">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <SkeletonList /> : pendingJobs.length === 0 ? (
                <EmptyState icon="check" title="All caught up!" description="All jobs have been assigned" />
              ) : (
                <div className="space-y-3">
                  {pendingJobs.slice(0, 5).map((job, i) => (
                    <JobRow key={job._id.toString()} job={job} index={i} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Status */}
          <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-5">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-display">Team Status</CardTitle>
                  <CardDescription>Worker availability and workload</CardDescription>
                </div>
                <Link href="/admin/team">
                  <Button variant="outline" size="sm" className="border-[var(--nimmit-border)]">Manage Team</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <SkeletonList /> : workers.length === 0 ? (
                <EmptyState icon="users" title="No workers yet" description="Workers will appear here when they register" />
              ) : (
                <div className="space-y-3">
                  {workers.slice(0, 5).map((worker, i) => (
                    <WorkerRow key={worker._id.toString()} worker={worker} jobs={jobs} index={i} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-display">Recent Activity</CardTitle>
            <CardDescription>Latest jobs and updates</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <SkeletonList /> : jobs.length === 0 ? (
              <EmptyState icon="activity" title="No activity yet" description="Recent jobs will appear here" />
            ) : (
              <div className="space-y-3">
                {jobs.slice(0, 5).map((job, i) => (
                  <ActivityRow key={job._id.toString()} job={job} index={i} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Stats Card
function StatsCard({ label, value, icon, color, highlight, delay }: {
  label: string; value: number; icon: React.ReactNode;
  color: "warning" | "primary" | "success" | "tertiary"; highlight?: boolean; delay: number;
}) {
  const colors = {
    warning: { bg: "bg-[var(--nimmit-warning)]/10", text: "text-[var(--nimmit-warning)]", border: highlight ? "border-[var(--nimmit-warning)]/50" : "" },
    primary: { bg: "bg-[var(--nimmit-accent-primary)]/10", text: "text-[var(--nimmit-accent-primary)]", border: "" },
    success: { bg: "bg-[var(--nimmit-success)]/10", text: "text-[var(--nimmit-success)]", border: "" },
    tertiary: { bg: "bg-[var(--nimmit-accent-secondary)]/10", text: "text-[var(--nimmit-accent-secondary)]", border: "" },
  };

  return (
    <Card className={`border-[var(--nimmit-border)] ${colors[color].border} shadow-sm animate-fade-up stagger-${delay + 1}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-sm font-medium">{label}</CardDescription>
          <div className={`p-2 rounded-lg ${colors[color].bg}`}>
            <svg className={`w-5 h-5 ${colors[color].text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">{icon}</svg>
          </div>
        </div>
        <CardTitle className="text-4xl font-display font-semibold">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

// Job Row
function JobRow({ job, index }: { job: JobWithPopulated; index: number }) {
  return (
    <Link href={`/admin/jobs/${job._id}`} className="block group">
      <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--nimmit-border)] hover:border-[var(--nimmit-accent-primary)]/30 hover:shadow-sm transition-all" style={{ animationDelay: `${index * 50}ms` }}>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate group-hover:text-[var(--nimmit-accent-primary)]">{job.title}</p>
          <p className="text-xs text-[var(--nimmit-text-tertiary)]">{job.clientId.profile.firstName} · {job.category}</p>
        </div>
        <div className="flex items-center gap-2 ml-2">
          {job.priority !== "standard" && <PriorityBadge priority={job.priority} />}
          <StatusBadge status="pending" />
        </div>
      </div>
    </Link>
  );
}

// Worker Row
function WorkerRow({ worker, jobs, index }: { worker: IUser; jobs: JobWithPopulated[]; index: number }) {
  const workerJobs = jobs.filter(j => j.workerId?._id === worker._id.toString() && !["completed", "cancelled"].includes(j.status));

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--nimmit-border)]" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[var(--nimmit-accent-primary)]/10 flex items-center justify-center">
          <span className="text-sm font-medium text-[var(--nimmit-accent-primary)]">
            {worker.profile.firstName[0]}{worker.profile.lastName[0]}
          </span>
        </div>
        <div>
          <p className="font-medium text-sm">{worker.profile.firstName} {worker.profile.lastName}</p>
          <p className="text-xs text-[var(--nimmit-text-tertiary)]">{workerJobs.length} active jobs</p>
        </div>
      </div>
      <AvailabilityBadge availability={worker.workerProfile?.availability || "offline"} />
    </div>
  );
}

// Activity Row
function ActivityRow({ job, index }: { job: JobWithPopulated; index: number }) {
  return (
    <Link href={`/admin/jobs/${job._id}`} className="block group">
      <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--nimmit-border)] hover:shadow-sm transition-all" style={{ animationDelay: `${index * 50}ms` }}>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate text-sm group-hover:text-[var(--nimmit-accent-primary)]">{job.title}</p>
          <p className="text-xs text-[var(--nimmit-text-tertiary)]">{new Date(job.updatedAt).toLocaleString()}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>
    </Link>
  );
}

// Skeleton List
function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-[var(--nimmit-border)]">
          <div className="space-y-2 flex-1"><div className="h-4 w-48 skeleton rounded" /><div className="h-3 w-32 skeleton rounded" /></div>
          <div className="h-5 w-20 skeleton rounded-full" />
        </div>
      ))}
    </div>
  );
}

// Empty State
function EmptyState({ icon, title, description }: { icon: "check" | "users" | "activity"; title: string; description: string }) {
  const icons = {
    check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />,
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
    activity: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  };

  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--nimmit-bg-secondary)] flex items-center justify-center">
        <svg className="w-6 h-6 text-[var(--nimmit-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">{icons[icon]}</svg>
      </div>
      <p className="font-medium text-[var(--nimmit-text-primary)]">{title}</p>
      <p className="text-sm text-[var(--nimmit-text-secondary)]">{description}</p>
    </div>
  );
}

// Badges
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; label: string }> = {
    pending: { className: "bg-[var(--nimmit-warning-bg)] text-[var(--nimmit-warning)] border-[var(--nimmit-warning)]/20", label: "Unassigned" },
    assigned: { className: "bg-[var(--nimmit-info-bg)] text-[var(--nimmit-info)] border-[var(--nimmit-info)]/20", label: "Assigned" },
    in_progress: { className: "bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)] border-[var(--nimmit-accent-primary)]/20", label: "In Progress" },
    review: { className: "bg-[var(--nimmit-info-bg)] text-[var(--nimmit-info)] border-[var(--nimmit-info)]/20", label: "In Review" },
    completed: { className: "bg-[var(--nimmit-success-bg)] text-[var(--nimmit-success)] border-[var(--nimmit-success)]/20", label: "Completed" },
  };
  const { className, label } = config[status] || config.pending;
  return <Badge variant="outline" className={`px-2 py-0.5 text-xs border rounded-full ${className}`}>{label}</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { className: string }> = {
    rush: { className: "bg-[var(--nimmit-error)]/10 text-[var(--nimmit-error)] border-[var(--nimmit-error)]/20" },
    express: { className: "bg-[var(--nimmit-warning-bg)] text-[var(--nimmit-warning)] border-[var(--nimmit-warning)]/20" },
  };
  return <Badge variant="outline" className={`px-2 py-0.5 text-xs border rounded-full ${config[priority]?.className}`}>{priority}</Badge>;
}

function AvailabilityBadge({ availability }: { availability: string }) {
  const config: Record<string, { className: string; label: string }> = {
    available: { className: "bg-[var(--nimmit-success-bg)] text-[var(--nimmit-success)] border-[var(--nimmit-success)]/20", label: "Available" },
    busy: { className: "bg-[var(--nimmit-warning-bg)] text-[var(--nimmit-warning)] border-[var(--nimmit-warning)]/20", label: "Busy" },
    offline: { className: "bg-[var(--nimmit-bg-secondary)] text-[var(--nimmit-text-tertiary)] border-[var(--nimmit-border)]", label: "Offline" },
  };
  const { className, label } = config[availability] || config.offline;
  return <Badge variant="outline" className={`px-2 py-0.5 text-xs border rounded-full ${className}`}>{label}</Badge>;
}
