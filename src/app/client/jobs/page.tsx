"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Job } from "@/types";

interface JobWithPopulated extends Omit<Job, "workerId"> {
  workerId?: {
    _id: string;
    profile: { firstName: string; lastName: string };
  };
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Tasks", icon: "📋" },
  { value: "pending", label: "Pending", icon: "⏳" },
  { value: "assigned", label: "Assigned", icon: "👤" },
  { value: "in_progress", label: "In Progress", icon: "🔄" },
  { value: "review", label: "Ready for Review", icon: "👀" },
  { value: "completed", label: "Completed", icon: "✅" },
  { value: "cancelled", label: "Cancelled", icon: "❌" },
];

export default function ClientJobsPage() {
  const [jobs, setJobs] = useState<JobWithPopulated[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      try {
        const url =
          statusFilter === "all"
            ? "/api/jobs"
            : `/api/jobs?status=${statusFilter}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
          setJobs(data.data.jobs);
        }
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, [statusFilter]);

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-semibold text-[var(--nimmit-text-primary)]">
            My Tasks
          </h1>
          <p className="text-sm text-[var(--nimmit-text-tertiary)]">
            {jobs.length} total tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/client/jobs/new">
            <Button size="sm" className="h-9 px-3">New Task</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] h-9 text-sm bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)]">
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="flex items-center gap-2">
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {statusFilter !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="h-9 px-2 text-[var(--nimmit-text-secondary)]"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Jobs List */}
      <div className="bg-[var(--nimmit-bg-elevated)] rounded-lg border border-[var(--nimmit-border)]">
        <div className="px-4 py-3 border-b border-[var(--nimmit-border)] bg-[var(--nimmit-bg-secondary)]/30">
          <div className="flex items-center text-xs font-medium text-[var(--nimmit-text-tertiary)]">
            <div className="flex-1">TASK</div>
            <div className="w-32 hidden sm:block">STATUS</div>
            <div className="w-24 text-right hidden sm:block">DATE</div>
          </div>
        </div>
        <div className="divide-y divide-[var(--nimmit-border)]">
          {loading ? (
            <SkeletonRows count={5} />
          ) : jobs.length === 0 ? (
            <EmptyState filter={statusFilter} onClearFilter={() => setStatusFilter("all")} />
          ) : (
            jobs.map((job, index) => (
              <JobRow key={job._id.toString()} job={job} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Compact Job Row
function JobRow({ job }: { job: JobWithPopulated }) {
  return (
    <Link
      href={`/client/jobs/${job._id}`}
      className="block hover:bg-[var(--nimmit-bg-secondary)] transition-colors group"
    >
      <div className="flex items-center px-4 py-2.5">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[var(--nimmit-text-primary)] truncate group-hover:text-[var(--nimmit-accent-primary)] transition-colors">
              {job.title}
            </p>
            {job.priority !== "standard" && <PriorityBadge priority={job.priority} />}
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--nimmit-text-tertiary)] mt-0.5">
            <span>{job.category}</span>
            {job.workerId && (
              <>
                <span>·</span>
                <span>Assigned to {job.workerId.profile.firstName}</span>
              </>
            )}
          </div>
        </div>

        <div className="w-32 flex items-center">
          <StatusBadge status={job.status} />
        </div>

        <div className="w-24 text-right text-xs text-[var(--nimmit-text-tertiary)] hidden sm:block">
          {new Date(job.createdAt).toLocaleDateString()}
        </div>

        <div className="w-6 flex justify-end sm:hidden">
          <svg className="w-4 h-4 text-[var(--nimmit-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

// Empty State
function EmptyState({ filter, onClearFilter }: { filter: string; onClearFilter: () => void }) {
  const isFiltered = filter !== "all";

  return (
    <div className="text-center py-12">
      <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-[var(--nimmit-bg-secondary)] flex items-center justify-center">
        <svg className="w-6 h-6 text-[var(--nimmit-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="text-sm font-medium text-[var(--nimmit-text-primary)] mb-1">
        {isFiltered ? "No matching tasks" : "No tasks yet"}
      </p>
      {isFiltered && (
        <Button variant="link" size="sm" onClick={onClearFilter} className="h-auto p-0">
          Clear filter
        </Button>
      )}
    </div>
  );
}

// Skeleton Rows
function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center px-4 py-3 border-b border-[var(--nimmit-border)] last:border-0">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 bg-[var(--nimmit-bg-secondary)] rounded animate-pulse" />
            <div className="h-3 w-24 bg-[var(--nimmit-bg-secondary)] rounded animate-pulse" />
          </div>
          <div className="h-5 w-20 bg-[var(--nimmit-bg-secondary)] rounded-full animate-pulse" />
        </div>
      ))}
    </>
  );
}

// Status Badge
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; label: string }> = {
    pending: { className: "bg-[var(--nimmit-warning)]/10 text-[var(--nimmit-warning)]", label: "Pending" },
    assigned: { className: "bg-[var(--nimmit-info)]/10 text-[var(--nimmit-info)]", label: "Assigned" },
    in_progress: { className: "bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)]", label: "In Progress" },
    review: { className: "bg-[#8E24AA]/10 text-[#8E24AA]", label: "Review" },
    revision: { className: "bg-[var(--nimmit-error)]/10 text-[var(--nimmit-error)]", label: "Revision" },
    completed: { className: "bg-[var(--nimmit-success)]/10 text-[var(--nimmit-success)]", label: "Done" },
    cancelled: { className: "bg-[var(--nimmit-bg-secondary)] text-[var(--nimmit-text-tertiary)]", label: "Cancelled" },
  };
  const { className, label } = config[status] || config.pending;
  return <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${className}`}>{label}</span>;
}

// Priority Badge
function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, string> = {
    rush: "bg-[var(--nimmit-error)]/10 text-[var(--nimmit-error)]",
    express: "bg-[var(--nimmit-warning)]/10 text-[var(--nimmit-warning)]",
  };
  return <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${config[priority]}`}>{priority}</span>;
}
