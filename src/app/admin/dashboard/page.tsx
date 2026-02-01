"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-2xl font-display font-medium text-[var(--nimmit-text-primary)] tracking-tight">Admin Overview</h1>
          <p className="text-sm text-[var(--nimmit-text-tertiary)] mt-1">System-wide monitoring and assignment control</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/jobs"><Button size="sm" variant="outline" className="rounded-full bg-white/50 border-gray-200">Jobs</Button></Link>
          <Link href="/admin/team"><Button size="sm" variant="outline" className="rounded-full bg-white/50 border-gray-200">Team</Button></Link>
        </div>
      </div>

      {/* Main Floating Panel */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-200/60 overflow-hidden min-h-[600px] flex flex-col">
        {/* Quick Stats Header */}
        <div className="flex items-center gap-8 px-8 py-5 border-b border-gray-100 bg-gray-50/30">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">Unassigned</span>
            <span className="text-2xl font-semibold text-amber-600">{pendingJobs.length}</span>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">Active</span>
            <span className="text-2xl font-semibold text-blue-600">{activeJobs.length}</span>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">Available Team</span>
            <span className="text-2xl font-semibold text-emerald-600">{availableWorkers.length}</span>
          </div>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 flex-1">

          {/* Left: Input Queue (Unassigned Jobs) */}
          <div className="flex flex-col">
            <div className="px-6 py-3 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                Action Required
              </h3>
              <Link href="/admin/jobs?status=pending" className="text-[10px] font-medium text-blue-600 hover:underline">View Queue</Link>
            </div>
            <div className="flex-1 p-2 space-y-2 bg-gray-50/30">
              {loading ? <SkeletonRows count={4} /> : pendingJobs.length === 0 ? (
                <EmptyRow message="Clean Queue! Great job. 🎉" />
              ) : pendingJobs.map(job => (
                <JobRow key={job._id.toString()} job={job} showClient />
              ))}
            </div>
          </div>

          {/* Right: Team Snapshot */}
          <div className="flex flex-col">
            <div className="px-6 py-3 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Team Availability</h3>
              <Link href="/admin/team" className="text-[10px] font-medium text-blue-600 hover:underline">Manage Team</Link>
            </div>
            <div className="flex-1 p-0">
              {loading ? <SkeletonRows count={5} /> : workers.length === 0 ? (
                <EmptyRow message="No team members found." />
              ) : workers.slice(0, 10).map(worker => (
                <WorkerRow key={worker._id.toString()} worker={worker} jobs={jobs} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact Stat Item
function StatItem({ label, value, color, highlight }: {
  label: string;
  value: number;
  color: "warning" | "primary" | "success" | "muted";
  highlight?: boolean;
}) {
  const colors = {
    warning: "text-[var(--nimmit-warning)]",
    primary: "text-[var(--nimmit-accent-primary)]",
    success: "text-[var(--nimmit-success)]",
    muted: "text-[var(--nimmit-text-tertiary)]",
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`text-2xl font-semibold font-display ${colors[color]} ${highlight ? "animate-pulse" : ""}`}>
        {value}
      </span>
      <span className="text-xs text-[var(--nimmit-text-tertiary)]">{label}</span>
    </div>
  );
}

// Dense Job Row
function JobRow({ job, showClient }: { job: JobWithPopulated; showClient?: boolean }) {
  return (
    <Link href={`/admin/jobs/${job._id}`} className="block hover:bg-[var(--nimmit-bg-secondary)] transition-colors">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{job.title}</p>
            <p className="text-xs text-[var(--nimmit-text-tertiary)] truncate">
              {showClient && `${job.clientId.profile.firstName} · `}{job.category}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {job.priority !== "standard" && <PriorityBadge priority={job.priority} />}
          <StatusBadge status={job.status} />
        </div>
      </div>
    </Link>
  );
}

// Worker Row
function WorkerRow({ worker, jobs }: { worker: IUser; jobs: JobWithPopulated[] }) {
  const activeJobs = jobs.filter(
    (j) => j.workerId?._id === worker._id.toString() && !["completed", "cancelled"].includes(j.status)
  ).length;

  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-[var(--nimmit-accent-primary)]/10 flex items-center justify-center text-xs font-medium text-[var(--nimmit-accent-primary)]">
          {worker.profile.firstName[0]}{worker.profile.lastName[0]}
        </div>
        <div>
          <p className="text-sm font-medium">{worker.profile.firstName} {worker.profile.lastName}</p>
          <p className="text-xs text-[var(--nimmit-text-tertiary)]">{activeJobs} active</p>
        </div>
      </div>
      <AvailabilityBadge availability={worker.workerProfile?.availability || "offline"} />
    </div>
  );
}

// Activity Row
function ActivityRow({ job }: { job: JobWithPopulated }) {
  return (
    <Link href={`/admin/jobs/${job._id}`} className="block hover:bg-[var(--nimmit-bg-secondary)] transition-colors">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <p className="text-sm truncate">{job.title}</p>
          <span className="text-xs text-[var(--nimmit-text-tertiary)] shrink-0">
            {new Date(job.updatedAt).toLocaleDateString()}
          </span>
        </div>
        <StatusBadge status={job.status} />
      </div>
    </Link>
  );
}

// Skeleton Rows
function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-2.5">
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-40 bg-[var(--nimmit-bg-secondary)] rounded animate-pulse" />
            <div className="h-2.5 w-24 bg-[var(--nimmit-bg-secondary)] rounded animate-pulse" />
          </div>
          <div className="h-5 w-16 bg-[var(--nimmit-bg-secondary)] rounded-full animate-pulse" />
        </div>
      ))}
    </>
  );
}

// Empty Row
function EmptyRow({ message }: { message: string }) {
  return (
    <div className="px-4 py-6 text-center text-sm text-[var(--nimmit-text-tertiary)]">
      {message}
    </div>
  );
}

// Badges
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; label: string }> = {
    pending: { className: "bg-[var(--nimmit-warning)]/10 text-[var(--nimmit-warning)]", label: "Unassigned" },
    assigned: { className: "bg-[var(--nimmit-info)]/10 text-[var(--nimmit-info)]", label: "Assigned" },
    in_progress: { className: "bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)]", label: "In Progress" },
    review: { className: "bg-[var(--nimmit-info)]/10 text-[var(--nimmit-info)]", label: "Review" },
    completed: { className: "bg-[var(--nimmit-success)]/10 text-[var(--nimmit-success)]", label: "Done" },
  };
  const { className, label } = config[status] || config.pending;
  return <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${className}`}>{label}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, string> = {
    rush: "bg-[var(--nimmit-error)]/10 text-[var(--nimmit-error)]",
    express: "bg-[var(--nimmit-warning)]/10 text-[var(--nimmit-warning)]",
  };
  return <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${config[priority]}`}>{priority}</span>;
}

function AvailabilityBadge({ availability }: { availability: string }) {
  const config: Record<string, { className: string; label: string }> = {
    available: { className: "bg-[var(--nimmit-success)]/10 text-[var(--nimmit-success)]", label: "Available" },
    busy: { className: "bg-[var(--nimmit-warning)]/10 text-[var(--nimmit-warning)]", label: "Busy" },
    offline: { className: "bg-[var(--nimmit-bg-secondary)] text-[var(--nimmit-text-tertiary)]", label: "Offline" },
  };
  const { className, label } = config[availability] || config.offline;
  return <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${className}`}>{label}</span>;
}
