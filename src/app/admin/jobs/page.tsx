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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Job } from "@/types";

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

const STATUS_OPTIONS = [
    { value: "all", label: "All Jobs", icon: "📋" },
    { value: "pending", label: "Unassigned", icon: "⏳" },
    { value: "assigned", label: "Assigned", icon: "👤" },
    { value: "in_progress", label: "In Progress", icon: "🔄" },
    { value: "review", label: "In Review", icon: "👀" },
    { value: "revision", label: "Revision", icon: "⚠️" },
    { value: "completed", label: "Completed", icon: "✅" },
    { value: "cancelled", label: "Cancelled", icon: "❌" },
];

export default function AdminJobsPage() {
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

    const pendingJobs = jobs.filter((j) => j.status === "pending");
    const activeJobs = jobs.filter((j) => ["assigned", "in_progress", "review", "revision"].includes(j.status));
    const completedJobs = jobs.filter((j) => j.status === "completed");
    const cancelledJobs = jobs.filter((j) => j.status === "cancelled");

    return (
        <div className="min-h-screen bg-[var(--nimmit-bg-primary)]">
            <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-up">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-[var(--nimmit-text-primary)]">
                            All Jobs
                        </h1>
                        <p className="text-[var(--nimmit-text-secondary)] mt-2">
                            Manage and assign all jobs in the system
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)]">
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
                            <Button variant="ghost" size="sm" onClick={() => setStatusFilter("all")}>Clear</Button>
                        )}
                    </div>
                </div>

                {/* Unassigned Queue - Priority */}
                {pendingJobs.length > 0 && (
                    <Card className="border-[var(--nimmit-warning)]/50 bg-[var(--nimmit-warning-bg)]/30 shadow-sm animate-fade-up stagger-1">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[var(--nimmit-warning)] animate-pulse" />
                                <CardTitle className="text-lg font-display text-[var(--nimmit-warning)]">
                                    Unassigned ({pendingJobs.length})
                                </CardTitle>
                            </div>
                            <CardDescription>Jobs waiting to be assigned to a team member</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {pendingJobs.map((job, i) => (
                                    <JobCard key={job._id.toString()} job={job} index={i} urgent />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Active Jobs */}
                <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-2">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-display">Active Jobs ({activeJobs.length})</CardTitle>
                        <CardDescription>Jobs currently being worked on</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <SkeletonList />
                        ) : activeJobs.length === 0 ? (
                            <EmptyState message="No active jobs" />
                        ) : (
                            <div className="space-y-3">
                                {activeJobs.map((job, i) => (
                                    <JobCard key={job._id.toString()} job={job} index={i} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Completed */}
                {completedJobs.length > 0 && (
                    <Card className="border-[var(--nimmit-success)]/30 shadow-sm animate-fade-up stagger-3">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-display text-[var(--nimmit-success)]">
                                Completed ({completedJobs.length})
                            </CardTitle>
                            <CardDescription>Successfully delivered jobs</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {completedJobs.slice(0, 10).map((job, i) => (
                                    <JobCard key={job._id.toString()} job={job} index={i} />
                                ))}
                                {completedJobs.length > 10 && (
                                    <p className="text-center text-sm text-[var(--nimmit-text-tertiary)] pt-2">
                                        Showing 10 of {completedJobs.length} completed jobs
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Cancelled */}
                {cancelledJobs.length > 0 && (
                    <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-4">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-display text-[var(--nimmit-text-tertiary)]">
                                Cancelled ({cancelledJobs.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {cancelledJobs.slice(0, 5).map((job, i) => (
                                    <JobCard key={job._id.toString()} job={job} index={i} />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

// Job Card
function JobCard({ job, index, urgent }: { job: JobWithPopulated; index: number; urgent?: boolean }) {
    return (
        <Link href={`/admin/jobs/${job._id}`} className="block group">
            <div
                className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200
                    ${urgent
                        ? "border-[var(--nimmit-warning)]/30 bg-white hover:border-[var(--nimmit-warning)]/50"
                        : "border-[var(--nimmit-border)] bg-[var(--nimmit-bg-elevated)] hover:border-[var(--nimmit-accent-primary)]/30"}
                    hover:shadow-md`}
                style={{ animationDelay: `${index * 50}ms` }}
            >
                <div className="space-y-1 flex-1 min-w-0">
                    <p className="font-medium text-[var(--nimmit-text-primary)] truncate group-hover:text-[var(--nimmit-accent-primary)] transition-colors">
                        {job.title}
                    </p>
                    <p className="text-sm text-[var(--nimmit-text-secondary)] flex flex-wrap items-center gap-x-2">
                        <span className="inline-flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {job.clientId.profile.firstName} {job.clientId.profile.lastName}
                        </span>
                        <span className="text-[var(--nimmit-text-tertiary)]">·</span>
                        <span>{job.category}</span>
                        <span className="text-[var(--nimmit-text-tertiary)]">·</span>
                        <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                        {job.workerId && (
                            <>
                                <span className="text-[var(--nimmit-text-tertiary)]">·</span>
                                <span className="text-[var(--nimmit-accent-primary)]">→ {job.workerId.profile.firstName}</span>
                            </>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                    {job.priority !== "standard" && <PriorityBadge priority={job.priority} />}
                    <StatusBadge status={job.status} />
                    <svg className="w-5 h-5 text-[var(--nimmit-text-tertiary)] group-hover:text-[var(--nimmit-accent-primary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </Link>
    );
}

// Empty State
function EmptyState({ message }: { message: string }) {
    return (
        <div className="text-center py-10">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[var(--nimmit-bg-secondary)] flex items-center justify-center">
                <svg className="w-7 h-7 text-[var(--nimmit-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            </div>
            <p className="text-[var(--nimmit-text-secondary)]">{message}</p>
        </div>
    );
}

// Skeleton List
function SkeletonList() {
    return (
        <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-[var(--nimmit-border)]">
                    <div className="space-y-2 flex-1">
                        <div className="h-5 w-64 skeleton rounded" />
                        <div className="h-4 w-48 skeleton rounded" />
                    </div>
                    <div className="h-6 w-24 skeleton rounded-full" />
                </div>
            ))}
        </div>
    );
}

// Status Badge
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { className: string; label: string }> = {
        pending: { className: "bg-[var(--nimmit-warning-bg)] text-[var(--nimmit-warning)] border-[var(--nimmit-warning)]/20", label: "Unassigned" },
        assigned: { className: "bg-[var(--nimmit-info-bg)] text-[var(--nimmit-info)] border-[var(--nimmit-info)]/20", label: "Assigned" },
        in_progress: { className: "bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)] border-[var(--nimmit-accent-primary)]/20", label: "In Progress" },
        review: { className: "bg-[var(--nimmit-info-bg)] text-[var(--nimmit-info)] border-[var(--nimmit-info)]/20", label: "In Review" },
        revision: { className: "bg-[var(--nimmit-error-bg)] text-[var(--nimmit-error)] border-[var(--nimmit-error)]/20", label: "Revision" },
        completed: { className: "bg-[var(--nimmit-success-bg)] text-[var(--nimmit-success)] border-[var(--nimmit-success)]/20", label: "Completed" },
        cancelled: { className: "bg-[var(--nimmit-bg-secondary)] text-[var(--nimmit-text-tertiary)] border-[var(--nimmit-border)]", label: "Cancelled" },
    };
    const { className, label } = config[status] || config.pending;
    return <Badge variant="outline" className={`px-2.5 py-0.5 text-xs font-medium border rounded-full ${className}`}>{label}</Badge>;
}

// Priority Badge
function PriorityBadge({ priority }: { priority: string }) {
    const config: Record<string, { className: string }> = {
        rush: { className: "bg-[var(--nimmit-error)]/10 text-[var(--nimmit-error)] border-[var(--nimmit-error)]/20" },
        express: { className: "bg-[var(--nimmit-warning-bg)] text-[var(--nimmit-warning)] border-[var(--nimmit-warning)]/20" },
    };
    return <Badge variant="outline" className={`px-2 py-0.5 text-xs border rounded-full ${config[priority]?.className}`}>{priority}</Badge>;
}
