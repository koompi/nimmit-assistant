"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Job } from "@/types";

interface JobWithPopulated extends Omit<Job, "workerId"> {
  workerId?: {
    _id: string;
    profile: { firstName: string; lastName: string };
    email: string;
  };
}

export default function ClientDashboard() {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<JobWithPopulated[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const response = await fetch("/api/jobs?limit=15");
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

  const activeJobs = jobs.filter((j) => !["completed", "cancelled"].includes(j.status));
  const inReview = jobs.filter((j) => j.status === "review");
  const completed = jobs.filter((j) => j.status === "completed");
  const firstName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      {/* Header - Transparent on the tinted background */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-2xl font-display font-medium text-[var(--nimmit-text-primary)] tracking-tight">
            Welcome, {firstName}
          </h1>
          <p className="text-sm text-[var(--nimmit-text-tertiary)] mt-1">
            Manage your creative projects and AI workflows
          </p>
        </div>
        <Link href="/client/jobs/new">
          <Button className="rounded-full shadow-sm bg-[var(--nimmit-accent-primary)] hover:bg-[var(--nimmit-accent-primary)]/90 h-10 px-6">
            <span className="text-lg mr-2 leading-none">+</span> New Task
          </Button>
        </Link>
      </div>

      {/* Main Floating Panel - Similar to 'Project List' in AI Studio */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-200/60 overflow-hidden min-h-[600px] flex flex-col">

        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-medium text-gray-900">Recent Activity</h2>
            <div className="h-4 w-px bg-gray-200"></div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-900 font-medium">{activeJobs.length} <span className="text-gray-500 font-normal">Active</span></span>
              <span className="text-gray-900 font-medium">{inReview.length} <span className="text-gray-500 font-normal">Review</span></span>
            </div>
          </div>
          <Link href="/client/jobs">
            <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs text-blue-600 hover:bg-blue-50">
              View All History →
            </Button>
          </Link>
        </div>

        {/* Content Table */}
        <div className="flex-1">
          <div className="divide-y divide-gray-100">
            <div className="grid grid-cols-12 px-6 py-3 bg-gray-50/50 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-6">Project Name</div>
              <div className="col-span-3">Status</div>
              <div className="col-span-3 text-right">Last Update</div>
            </div>

            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-2xl">✨</span>
                </div>
                <h3 className="text-gray-900 font-medium mb-1">Start building with Nimmit</h3>
                <p className="text-gray-500 text-sm max-w-xs mb-6">Create your first task to see it tracked here live.</p>
                <Link href="/client/jobs/new">
                  <Button variant="outline" className="rounded-full">Create Task</Button>
                </Link>
              </div>
            ) : (
              jobs.slice(0, 10).map((job) => (
                <Link key={job._id.toString()} href={`/client/jobs/${job._id}`} className="grid grid-cols-12 px-6 py-4 hover:bg-gray-50 transition-colors group items-center border-l-2 border-transparent hover:border-blue-500">
                  <div className="col-span-6 font-medium text-gray-900 truncate pr-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {job.title.charAt(0)}
                    </div>
                    {job.title}
                  </div>
                  <div className="col-span-3">
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="col-span-3 text-right text-sm text-gray-500 font-mono">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                </Link>
              ))
            )}
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
  color: "primary" | "info" | "success";
  highlight?: boolean;
}) {
  const colors = {
    primary: "text-[var(--nimmit-accent-primary)]",
    info: "text-[var(--nimmit-info)]",
    success: "text-[var(--nimmit-success)]",
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
    <Link href={`/client/jobs/${job._id}`} className="block hover:bg-[var(--nimmit-bg-secondary)] transition-colors">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {job.status === "in_progress" && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--nimmit-accent-primary)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--nimmit-accent-primary)]" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{job.title}</p>
            <div className="flex items-center gap-2 text-xs text-[var(--nimmit-text-tertiary)]">
              <span>{job.category}</span>
              <span>·</span>
              <span>{new Date(job.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <StatusBadge status={job.status} />
      </div>
    </Link>
  );
}

// Empty State
function EmptyState() {
  return (
    <div className="px-4 py-12 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-[var(--nimmit-bg-secondary)] flex items-center justify-center">
        <svg className="w-6 h-6 text-[var(--nimmit-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="font-medium text-sm text-[var(--nimmit-text-primary)] mb-1">No tasks yet</p>
      <p className="text-xs text-[var(--nimmit-text-tertiary)] mb-4">Submit your first task to get started</p>
      <Link href="/client/jobs/new">
        <Button size="sm">Create First Task</Button>
      </Link>
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
function TipCard({ emoji, title, description, href }: {
  emoji: string;
  title: string;
  description: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--nimmit-bg-elevated)] border border-[var(--nimmit-border)]">
      <span className="text-lg">{emoji}</span>
      <div>
        <p className="text-sm font-medium text-[var(--nimmit-text-primary)]">{title}</p>
        <p className="text-xs text-[var(--nimmit-text-tertiary)]">{description}</p>
      </div>
    </div>
  );

  return href ? <Link href={href} className="block hover:opacity-80">{content}</Link> : content;
}

// Status Badge
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; label: string }> = {
    pending: { className: "bg-[var(--nimmit-warning)]/10 text-[var(--nimmit-warning)]", label: "Pending" },
    assigned: { className: "bg-[var(--nimmit-info)]/10 text-[var(--nimmit-info)]", label: "Assigned" },
    in_progress: { className: "bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)]", label: "In Progress" },
    review: { className: "bg-[#8E24AA]/10 text-[#8E24AA]", label: "Review" },
    revision: { className: "bg-[var(--nimmit-warning)]/10 text-[var(--nimmit-warning)]", label: "Revision" },
    completed: { className: "bg-[var(--nimmit-success)]/10 text-[var(--nimmit-success)]", label: "Done" },
    cancelled: { className: "bg-[var(--nimmit-error)]/10 text-[var(--nimmit-error)]", label: "Cancelled" },
  };
  const { className, label } = config[status] || config.pending;
  return <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full shrink-0 ${className}`}>{label}</span>;
}
