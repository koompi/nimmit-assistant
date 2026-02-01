"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Job } from "@/types";

interface JobWithPopulated extends Omit<Job, "clientId"> {
  clientId: {
    _id: string;
    profile: { firstName: string; lastName: string };
    email: string;
  };
}

export default function WorkerDashboard() {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<JobWithPopulated[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const response = await fetch("/api/jobs");
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
  }, []);

  const activeJobs = jobs.filter((j) =>
    ["assigned", "in_progress", "revision"].includes(j.status)
  );
  const inReview = jobs.filter((j) => j.status === "review");
  const completedThisWeek = jobs.filter((j) => {
    if (j.status !== "completed" || !j.completedAt) return false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(j.completedAt) > weekAgo;
  });
  const totalCompleted = jobs.filter((j) => j.status === "completed").length;

  const firstName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      {/* Header - Transparent on the tinted background */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-2xl font-display font-medium text-[var(--nimmit-text-primary)] tracking-tight">
            Worker Dashboard
          </h1>
          <p className="text-sm text-[var(--nimmit-text-tertiary)] mt-1">
            Manage your assignments and track your earnings
          </p>
        </div>
        {/* Quick Action? */}
      </div>

      {/* Main Floating Panel */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-200/60 overflow-hidden min-h-[600px] flex flex-col">

        {/* Panel Header with Stats */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-6">
            <h2 className="text-base font-medium text-gray-900">My Workspace</h2>
            <div className="h-4 w-px bg-gray-200"></div>
            <div className="flex gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Assigned</span>
                <span className="text-lg font-semibold text-gray-900 leading-none">{activeJobs.length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Review</span>
                <span className="text-lg font-semibold text-gray-900 leading-none">{inReview.length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Done (W)</span>
                <span className="text-lg font-semibold text-green-600 leading-none">{completedThisWeek.length}</span>
              </div>
            </div>
          </div>
          <Link href="/worker/jobs">
            <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs text-blue-600 hover:bg-blue-50">
              View All Jobs →
            </Button>
          </Link>
        </div>

        {/* Content Area - Split View or unified list */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 flex-1">

          {/* Left: Active Assignments */}
          <div className="flex flex-col">
            <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">Active Priority</h3>
            </div>
            <div className="flex-1 p-2 space-y-2">
              {loading ? <SkeletonRows count={3} /> : activeJobs.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">No active assignments. Relax! 🌴</div>
              ) : activeJobs.map(job => (
                <Link key={job._id.toString()} href={`/worker/jobs/${job._id}`} className="block p-3 rounded-xl hover:bg-blue-50/50 border border-transparent hover:border-blue-100 transition-all group">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">{job.title}</span>
                    {job.priority !== 'standard' && <PriorityBadge priority={job.priority} />}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span>{job.clientId.profile.firstName}</span>
                    <span>•</span>
                    <span>{job.category}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={job.status} />
                    <span className="text-[10px] text-gray-400 font-mono">{new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Right: In Review / Recent */}
          <div className="flex flex-col bg-gray-50/30">
            <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">Pending Review</h3>
            </div>
            <div className="flex-1 p-2 space-y-2">
              {loading ? <SkeletonRows count={2} /> : inReview.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">Nothing pending review.</div>
              ) : inReview.map(job => (
                <Link key={job._id.toString()} href={`/worker/jobs/${job._id}`} className="block p-3 rounded-xl bg-white border border-gray-100 hover:shadow-sm transition-all opacity-80 hover:opacity-100">
                  <div className="font-medium text-gray-900 text-sm mb-1">{job.title}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-purple-600 font-medium">In Review</span>
                    <span className="text-[10px] text-gray-400">{new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
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
  color: "primary" | "info" | "success" | "muted";
  highlight?: boolean;
}) {
  const colors = {
    primary: "text-[var(--nimmit-accent-primary)]",
    info: "text-[var(--nimmit-info)]",
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
function JobRow({ job }: { job: JobWithPopulated }) {
  return (
    <Link href={`/worker/jobs/${job._id}`} className="block hover:bg-[var(--nimmit-bg-secondary)] transition-colors">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{job.title}</p>
            <div className="flex items-center gap-2 text-xs text-[var(--nimmit-text-tertiary)]">
              <span>{job.clientId.profile.firstName} {job.clientId.profile.lastName}</span>
              <span>·</span>
              <span>{job.category}</span>
            </div>
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

// Empty Row
function EmptyRow({ message }: { message: string }) {
  return (
    <div className="px-4 py-6 text-center text-sm text-[var(--nimmit-text-tertiary)]">
      {message}
    </div>
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

// Tip Card - Compact
function TipCard({ emoji, title, description }: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--nimmit-bg-elevated)] border border-[var(--nimmit-border)]">
      <span className="text-lg">{emoji}</span>
      <div>
        <p className="text-sm font-medium text-[var(--nimmit-text-primary)]">{title}</p>
        <p className="text-xs text-[var(--nimmit-text-tertiary)]">{description}</p>
      </div>
    </div>
  );
}

// Status Badge
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; label: string }> = {
    assigned: { className: "bg-[var(--nimmit-info)]/10 text-[var(--nimmit-info)]", label: "New" },
    in_progress: { className: "bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)]", label: "In Progress" },
    review: { className: "bg-[#8E24AA]/10 text-[#8E24AA]", label: "Review" },
    revision: { className: "bg-[var(--nimmit-error)]/10 text-[var(--nimmit-error)]", label: "Revision" },
    completed: { className: "bg-[var(--nimmit-success)]/10 text-[var(--nimmit-success)]", label: "Done" },
  };
  const { className, label } = config[status] || config.assigned;
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
