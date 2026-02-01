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

interface JobWithPopulated extends Omit<Job, "clientId"> {
    clientId: {
        _id: string;
        profile: { firstName: string; lastName: string };
        email: string;
    };
}

const STATUS_OPTIONS = [
    { value: "all", label: "All Jobs", icon: "📋" },
    { value: "assigned", label: "Assigned", icon: "👤" },
    { value: "in_progress", label: "In Progress", icon: "🔄" },
    { value: "revision", label: "Needs Revision", icon: "⚠️" },
    { value: "review", label: "In Review", icon: "👀" },
    { value: "completed", label: "Completed", icon: "✅" },
];

export default function WorkerJobsPage() {
    const [jobs, setJobs] = useState<JobWithPopulated[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("all");

    useEffect(() => {
        async function fetchJobs() {
            setLoading(true);
            try {
                const url = statusFilter === "all" ? "/api/jobs" : `/api/jobs?status=${statusFilter}`;
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

    const getStatusGroup = (status: string) => {
        if (["assigned", "in_progress", "revision"].includes(status)) return "active";
        if (status === "review") return "review";
        if (status === "completed") return "completed";
        return "other";
    };

    const activeJobs = jobs.filter((j) => getStatusGroup(j.status) === "active");
    const reviewJobs = jobs.filter((j) => getStatusGroup(j.status) === "review");
    const completedJobs = jobs.filter((j) => getStatusGroup(j.status) === "completed");

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-display font-semibold text-[var(--nimmit-text-primary)]">
                        My Assignments
                    </h1>
                    <p className="text-sm text-[var(--nimmit-text-tertiary)]">
                        {jobs.length} total assignments
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[160px] h-9 text-sm bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)]">
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
                </div>
            </div>

            {/* Active Jobs */}
            <div className="bg-[var(--nimmit-bg-elevated)] rounded-lg border border-[var(--nimmit-border)]">
                <div className="px-4 py-3 border-b border-[var(--nimmit-border)] bg-[var(--nimmit-bg-secondary)]/30">
                    <h2 className="text-xs font-semibold text-[var(--nimmit-text-secondary)] uppercase tracking-wider">Active Jobs</h2>
                </div>
                <div className="divide-y divide-[var(--nimmit-border)]">
                    {loading ? (
                        <SkeletonRows count={3} />
                    ) : activeJobs.length === 0 ? (
                        <EmptyRow message="No active jobs" />
                    ) : (
                        activeJobs.map((job) => (
                            <JobRow key={job._id.toString()} job={job} highlight />
                        ))
                    )}
                </div>
            </div>

            {/* In Review */}
            {reviewJobs.length > 0 && (
                <div className="bg-[var(--nimmit-bg-elevated)] rounded-lg border border-[var(--nimmit-info)]/30">
                    <div className="px-4 py-3 border-b border-[var(--nimmit-info)]/20 bg-[var(--nimmit-info)]/5">
                        <h2 className="text-xs font-semibold text-[var(--nimmit-info)] uppercase tracking-wider">Awaiting Review</h2>
                    </div>
                    <div className="divide-y divide-[var(--nimmit-border)]">
                        {reviewJobs.map((job) => (
                            <JobRow key={job._id.toString()} job={job} />
                        ))}
                    </div>
                </div>
            )}

            {/* Completed */}
            {completedJobs.length > 0 && (
                <div className="bg-[var(--nimmit-bg-elevated)] rounded-lg border border-[var(--nimmit-border)] opacity-80">
                    <div className="px-4 py-3 border-b border-[var(--nimmit-border)]">
                        <h2 className="text-xs font-semibold text-[var(--nimmit-text-tertiary)] uppercase tracking-wider">Completed History</h2>
                    </div>
                    <div className="divide-y divide-[var(--nimmit-border)]">
                        {completedJobs.slice(0, 10).map((job) => (
                            <JobRow key={job._id.toString()} job={job} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Compact Job Row
function JobRow({ job, highlight }: { job: JobWithPopulated; highlight?: boolean }) {
    const hasRevision = job.status === "revision";

    return (
        <Link href={`/worker/jobs/${job._id}`} className={`block hover:bg-[var(--nimmit-bg-secondary)] transition-colors group ${hasRevision ? "bg-[var(--nimmit-error)]/5 hover:bg-[var(--nimmit-error)]/10" : ""}`}>
            <div className="flex items-center px-4 py-2.5">
                <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[var(--nimmit-text-primary)] truncate group-hover:text-[var(--nimmit-accent-primary)] transition-colors">
                            {job.title}
                        </p>
                        {hasRevision && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold text-[var(--nimmit-error)] border border-[var(--nimmit-error)]/20 rounded">
                                ACTION REQUIRED
                            </span>
                        )}
                        {job.priority !== "standard" && <PriorityBadge priority={job.priority} />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--nimmit-text-tertiary)] mt-0.5">
                        <span>{job.clientId.profile.firstName} {job.clientId.profile.lastName}</span>
                        <span>·</span>
                        <span>{job.category}</span>
                        <span>·</span>
                        <span>Due {new Date(new Date(job.createdAt).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="w-32 flex items-center justify-end">
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
        assigned: { className: "bg-[var(--nimmit-info)]/10 text-[var(--nimmit-info)]", label: "New Assignment" },
        in_progress: { className: "bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)]", label: "In Progress" },
        review: { className: "bg-[#8E24AA]/10 text-[#8E24AA]", label: "Review" },
        revision: { className: "bg-[var(--nimmit-error)]/10 text-[var(--nimmit-error)]", label: "Needs Revision" },
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
