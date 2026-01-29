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
    <div className="min-h-screen bg-[var(--nimmit-bg-primary)]">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Welcome Section */}
        <div className="animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-[var(--nimmit-text-primary)]">
            Welcome, {firstName}!
          </h1>
          <p className="text-[var(--nimmit-text-secondary)] mt-2 text-lg">
            Here&apos;s your current workload overview.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            label="Current Jobs"
            value={activeJobs.length}
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />}
            color="primary"
            delay={0}
          />
          <StatsCard
            label="Awaiting Review"
            value={inReview.length}
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />}
            color="info"
            delay={1}
          />
          <StatsCard
            label="This Week"
            value={completedThisWeek.length}
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />}
            color="success"
            delay={2}
          />
          <StatsCard
            label="Total Completed"
            value={totalCompleted}
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
            color="tertiary"
            delay={3}
          />
        </div>

        {/* Current Assignments */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-4">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-display">Current Assignments</CardTitle>
                <CardDescription className="text-[var(--nimmit-text-secondary)]">
                  Jobs you&apos;re working on
                </CardDescription>
              </div>
              <Link href="/worker/jobs">
                <Button variant="outline" size="sm" className="border-[var(--nimmit-border)] hover:bg-[var(--nimmit-bg-secondary)]">
                  View All Jobs
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-[var(--nimmit-border)]">
                    <div className="space-y-2 flex-1">
                      <div className="h-5 w-64 skeleton rounded" />
                      <div className="h-4 w-48 skeleton rounded" />
                    </div>
                    <div className="h-6 w-24 skeleton rounded-full" />
                  </div>
                ))}
              </div>
            ) : activeJobs.length === 0 ? (
              <EmptyState
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />}
                title="No active assignments"
                description="Check back soon for new jobs!"
              />
            ) : (
              <div className="space-y-3">
                {activeJobs.map((job, index) => (
                  <JobCard key={job._id.toString()} job={job} index={index} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* In Review */}
        {inReview.length > 0 && (
          <Card className="border-[var(--nimmit-info)]/30 bg-[var(--nimmit-info-bg)]/30 shadow-sm animate-fade-up stagger-5">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--nimmit-info)]/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--nimmit-info)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-lg font-display">Awaiting Client Review</CardTitle>
                  <CardDescription>Jobs you&apos;ve submitted for review</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inReview.map((job) => (
                  <Link key={job._id.toString()} href={`/worker/jobs/${job._id}`} className="block group">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--nimmit-border)] bg-white hover:border-[var(--nimmit-info)]/30 hover:shadow-sm transition-all duration-200">
                      <div className="space-y-1">
                        <p className="font-medium text-[var(--nimmit-text-primary)] group-hover:text-[var(--nimmit-info)] transition-colors">
                          {job.title}
                        </p>
                        <p className="text-sm text-[var(--nimmit-text-secondary)]">
                          Submitted {new Date(job.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-[var(--nimmit-info-bg)] text-[var(--nimmit-info)] border-[var(--nimmit-info)]/20">
                        In Review
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Tips for Workers */}
        <div className="grid gap-4 md:grid-cols-2 animate-fade-up stagger-6">
          <TipCard
            title="⚡ Quick Tip"
            description="Start with the most urgent jobs first. Rush jobs should be completed within 12 hours."
          />
          <TipCard
            title="💬 Communication"
            description="Keep clients updated on your progress. A quick message goes a long way!"
          />
        </div>
      </div>
    </div>
  );
}

// Stats Card
function StatsCard({ label, value, icon, color, delay }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "primary" | "info" | "success" | "tertiary";
  delay: number;
}) {
  const colorClasses = {
    primary: { bg: "bg-[var(--nimmit-accent-primary)]/10", text: "text-[var(--nimmit-accent-primary)]" },
    info: { bg: "bg-[var(--nimmit-info)]/10", text: "text-[var(--nimmit-info)]" },
    success: { bg: "bg-[var(--nimmit-success)]/10", text: "text-[var(--nimmit-success)]" },
    tertiary: { bg: "bg-[var(--nimmit-accent-secondary)]/10", text: "text-[var(--nimmit-accent-secondary)]" },
  };

  return (
    <Card className={`border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-${delay + 1}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-sm font-medium text-[var(--nimmit-text-secondary)]">{label}</CardDescription>
          <div className={`p-2 rounded-lg ${colorClasses[color].bg}`}>
            <svg className={`w-5 h-5 ${colorClasses[color].text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {icon}
            </svg>
          </div>
        </div>
        <CardTitle className="text-4xl font-display font-semibold text-[var(--nimmit-text-primary)]">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

// Job Card
function JobCard({ job, index }: { job: JobWithPopulated; index: number }) {
  return (
    <Link href={`/worker/jobs/${job._id}`} className="block group">
      <div
        className="flex items-center justify-between p-4 rounded-xl border border-[var(--nimmit-border)] bg-[var(--nimmit-bg-elevated)] hover:border-[var(--nimmit-accent-primary)]/30 hover:shadow-md transition-all duration-200 animate-fade-up"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="space-y-1 flex-1 min-w-0">
          <p className="font-medium text-[var(--nimmit-text-primary)] truncate group-hover:text-[var(--nimmit-accent-primary)] transition-colors">
            {job.title}
          </p>
          <p className="text-sm text-[var(--nimmit-text-secondary)] flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {job.clientId.profile.firstName} {job.clientId.profile.lastName}
            </span>
            <span className="text-[var(--nimmit-text-tertiary)]">·</span>
            <span>{job.category}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <StatusBadge status={job.status} />
          {job.priority !== "standard" && <PriorityBadge priority={job.priority} />}
          <svg className="w-5 h-5 text-[var(--nimmit-text-tertiary)] group-hover:text-[var(--nimmit-accent-primary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

// Empty State
function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--nimmit-bg-secondary)] flex items-center justify-center">
        <svg className="w-8 h-8 text-[var(--nimmit-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {icon}
        </svg>
      </div>
      <h3 className="text-lg font-medium text-[var(--nimmit-text-primary)] mb-2">{title}</h3>
      <p className="text-[var(--nimmit-text-secondary)]">{description}</p>
    </div>
  );
}

// Tip Card
function TipCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-[var(--nimmit-border)] bg-[var(--nimmit-bg-secondary)]/50">
      <CardContent className="p-5">
        <h4 className="font-medium text-[var(--nimmit-text-primary)] mb-1">{title}</h4>
        <p className="text-sm text-[var(--nimmit-text-secondary)]">{description}</p>
      </CardContent>
    </Card>
  );
}

// Status Badge
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; label: string }> = {
    assigned: { className: "bg-[var(--nimmit-info-bg)] text-[var(--nimmit-info)] border-[var(--nimmit-info)]/20", label: "New" },
    in_progress: { className: "bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)] border-[var(--nimmit-accent-primary)]/20", label: "In Progress" },
    revision: { className: "bg-[var(--nimmit-error-bg)] text-[var(--nimmit-error)] border-[var(--nimmit-error)]/20", label: "Needs Revision" },
  };
  const { className, label } = config[status] || config.assigned;
  return <Badge variant="outline" className={`px-2.5 py-0.5 text-xs font-medium border rounded-full ${className}`}>{label}</Badge>;
}

// Priority Badge
function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { className: string; label: string }> = {
    rush: { className: "bg-[var(--nimmit-error)]/10 text-[var(--nimmit-error)] border-[var(--nimmit-error)]/20", label: "Rush" },
    express: { className: "bg-[var(--nimmit-warning-bg)] text-[var(--nimmit-warning)] border-[var(--nimmit-warning)]/20", label: "Express" },
  };
  const { className, label } = config[priority] || { className: "", label: priority };
  return <Badge variant="outline" className={`px-2 py-0.5 text-xs font-medium border rounded-full ${className}`}>{label}</Badge>;
}
