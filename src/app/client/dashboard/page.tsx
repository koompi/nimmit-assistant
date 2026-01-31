"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
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
        const response = await fetch("/api/jobs?limit=5");
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

  const activeJobs = jobs.filter(
    (j) => !["completed", "cancelled"].includes(j.status)
  );

  const firstName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-[var(--nimmit-bg-primary)] pb-20">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-up">
          <div>
            <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-[var(--nimmit-text-primary)] mb-3">
              Welcome back, {firstName}
            </h1>
            <p className="text-[var(--nimmit-text-secondary)] text-lg md:text-xl font-light">
              Send us your tasks before bed, wake up to completed work.
            </p>
          </div>
          <Link href="/client/jobs/new">
            <Button
              size="lg"
              className="h-14 px-8 text-base font-semibold shadow-soft-md hover:shadow-soft-lg transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Request New Task
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <StatsCard
            label="Active Tasks"
            value={activeJobs.length}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            color="primary"
            delay={0}
          />
          <StatsCard
            label="In Review"
            value={jobs.filter((j) => j.status === "review").length}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
            color="info"
            delay={1}
          />
          <StatsCard
            label="Completed"
            value={jobs.filter((j) => j.status === "completed").length}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            }
            color="success"
            delay={2}
          />
        </div>

        {/* Recent Jobs */}
        <div className="space-y-6 animate-fade-up stagger-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-display font-semibold text-[var(--nimmit-text-primary)]">Recent Tasks</h2>
              <p className="text-[var(--nimmit-text-secondary)]">Your latest task activity</p>
            </div>
            <Link href="/client/jobs">
              <Button
                variant="ghost"
                className="text-[var(--nimmit-text-secondary)] hover:text-[var(--nimmit-text-primary)] hover:bg-[var(--nimmit-bg-secondary)]"
              >
                View All
                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </Link>
          </div>

          <div className="grid gap-4">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl border border-[var(--nimmit-border)] bg-[var(--nimmit-bg-secondary)] animate-pulse" />
              ))
            ) : jobs.length === 0 ? (
              <EmptyState />
            ) : (
              jobs.slice(0, 5).map((job, index) => (
                <JobCard key={job._id.toString()} job={job} index={index} />
              ))
            )}
          </div>
        </div>

        {/* Quick Tips */}
        {jobs.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 animate-fade-up stagger-4">
            <TipCard
              title="💡 Pro Tip"
              description="Submit tasks by 10 PM to get them completed overnight. Our team works while you sleep!"
            />
            <TipCard
              title="📋 Need bulk work?"
              description="Contact us for enterprise plans with dedicated team members and priority support."
              action={{ label: "Learn More", href: "/pricing" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Stats Card Component
function StatsCard({
  label,
  value,
  icon,
  color,
  delay,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "primary" | "info" | "success";
  delay: number;
}) {
  const colorClasses = {
    primary: {
      bg: "bg-[var(--nimmit-accent-primary)]/10",
      text: "text-[var(--nimmit-accent-primary)]",
    },
    info: {
      bg: "bg-[var(--nimmit-info)]/10",
      text: "text-[var(--nimmit-info)]",
    },
    success: {
      bg: "bg-[var(--nimmit-success)]/10",
      text: "text-[var(--nimmit-success)]",
    },
  };

  return (
    <div className={`p-6 rounded-[var(--nimmit-radius-2xl)] border border-[var(--nimmit-border)] bg-[var(--nimmit-bg-elevated)] shadow-soft-sm hover:shadow-soft-md transition-all duration-300 animate-fade-up stagger-${delay + 1}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-[var(--nimmit-text-secondary)]">
          {label}
        </span>
        <div className={`p-2.5 rounded-[var(--nimmit-radius-lg)] ${colorClasses[color].bg}`}>
          <span className={colorClasses[color].text}>{icon}</span>
        </div>
      </div>
      <div className="text-4xl font-display font-semibold text-[var(--nimmit-text-primary)]">
        {value}
      </div>
    </div>
  );
}

// Job Card Component
function JobCard({ job, index }: { job: JobWithPopulated; index: number }) {
  return (
    <Link
      href={`/client/jobs/${job._id}`}
      className="block group"
    >
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-[var(--nimmit-radius-xl)] 
                    border border-[var(--nimmit-border)] bg-[var(--nimmit-bg-elevated)] 
                    hover:border-[var(--nimmit-accent-primary)]/40 hover:bg-white
                    hover:shadow-soft-md transition-all duration-300 animate-fade-up stagger-${index + 1}`}
      >
        <div className="space-y-1.5 flex-1 min-w-0 mb-4 sm:mb-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg text-[var(--nimmit-text-primary)] group-hover:text-[var(--nimmit-accent-primary)] transition-colors line-clamp-1">
              {job.title}
            </h3>
            {job.status === 'in_progress' && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--nimmit-accent-primary)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--nimmit-accent-primary)]"></span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-[var(--nimmit-text-secondary)]">
            <Badge variant="soft" className="font-normal rounded-[var(--nimmit-radius-md)] px-2 h-6">
              {job.category}
            </Badge>
            <span className="text-[var(--nimmit-text-tertiary)]">•</span>
            <span>Created {new Date(job.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <StatusBadge status={job.status} />
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--nimmit-text-tertiary)] group-hover:bg-[var(--nimmit-accent-primary)]/10 group-hover:text-[var(--nimmit-accent-primary)] transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <div className="text-center py-16 px-6 rounded-[var(--nimmit-radius-2xl)] border-2 border-dashed border-[var(--nimmit-border)] bg-[var(--nimmit-bg-secondary)]/30">
      <div className="w-20 h-20 mx-auto mb-6 rounded-[var(--nimmit-radius-xl)] bg-[var(--nimmit-bg-primary)] shadow-sm flex items-center justify-center">
        <svg className="w-10 h-10 text-[var(--nimmit-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-xl font-display font-semibold text-[var(--nimmit-text-primary)] mb-2">
        No active tasks
      </h3>
      <p className="text-[var(--nimmit-text-secondary)] mb-8 max-w-md mx-auto">
        Your dashboard is empty! Submit your first task now and our team will get started on it while you sleep.
      </p>
      <Link href="/client/jobs/new">
        <Button size="lg" className="px-8 shadow-soft-lg hover:shadow-soft-xl">
          Create First Task
        </Button>
      </Link>
    </div>
  );
}

// Tip Card Component
function TipCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="p-6 rounded-[var(--nimmit-radius-2xl)] border border-[var(--nimmit-border)] bg-[var(--nimmit-bg-tertiary)]/50">
      <h4 className="font-semibold text-[var(--nimmit-text-primary)] mb-2">{title}</h4>
      <p className="text-sm text-[var(--nimmit-text-secondary)] leading-relaxed">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-[var(--nimmit-accent-primary)] hover:underline"
        >
          {action.label}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; label: string }> = {
    pending: {
      className: "bg-[var(--nimmit-warning)]/10 text-[var(--nimmit-warning)] border-[var(--nimmit-warning)]/20",
      label: "Pending",
    },
    assigned: {
      className: "bg-[var(--nimmit-info)]/10 text-[var(--nimmit-info)] border-[var(--nimmit-info)]/20",
      label: "Assigned",
    },
    in_progress: {
      className: "bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)] border-[var(--nimmit-accent-primary)]/20",
      label: "In Progress",
    },
    review: {
      className: "bg-[#8E24AA]/10 text-[#8E24AA] border-[#8E24AA]/20",
      label: "Ready for Review",
    },
    revision: {
      className: "bg-[var(--nimmit-warning)]/10 text-[var(--nimmit-warning)] border-[var(--nimmit-warning)]/20",
      label: "Revision",
    },
    completed: {
      className: "bg-[var(--nimmit-success)]/10 text-[var(--nimmit-success)] border-[var(--nimmit-success)]/20",
      label: "Completed",
    },
    cancelled: {
      className: "bg-[var(--nimmit-error)]/10 text-[var(--nimmit-error)] border-[var(--nimmit-error)]/20",
      label: "Cancelled",
    },
  };

  const { className, label } = config[status] || config.pending;

  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-xs font-semibold border rounded-full ${className}`}
    >
      {label}
    </span>
  );
}
