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
        <div className="min-h-screen bg-[var(--nimmit-bg-primary)]">
            <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
                {/* Header */}
                <div className="animate-fade-up">
                    <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-[var(--nimmit-text-primary)]">
                        My Assignments
                    </h1>
                    <p className="text-[var(--nimmit-text-secondary)] mt-2">
                        View and manage your assigned tasks
                    </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4 animate-fade-up stagger-1">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[200px] h-11 bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent className="bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)]">
                            {STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                                    <span className="flex items-center gap-2">
                                        <span>{option.icon}</span>
                                        <span>{option.label}</span>
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {statusFilter !== "all" && (
                        <Button variant="ghost" size="sm" onClick={() => setStatusFilter("all")} className="text-[var(--nimmit-text-secondary)]">
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Clear
                        </Button>
                    )}
                </div>

                {/* Active Jobs */}
                <JobSection
                    title="Active Jobs"
                    description="Jobs you're currently working on"
                    jobs={activeJobs}
                    loading={loading}
                    emptyIcon="inbox"
                    emptyMessage="No active jobs at the moment"
                    highlight
                    delay={2}
                />

                {/* In Review */}
                {reviewJobs.length > 0 && (
                    <JobSection
                        title="Awaiting Review"
                        description="Jobs waiting for client approval"
                        jobs={reviewJobs}
                        loading={false}
                        color="info"
                        delay={3}
                    />
                )}

                {/* Completed */}
                {completedJobs.length > 0 && (
                    <JobSection
                        title="Completed"
                        description="Successfully delivered jobs"
                        jobs={completedJobs.slice(0, 10)}
                        loading={false}
                        color="success"
                        showMore={completedJobs.length > 10 ? completedJobs.length : undefined}
                        delay={4}
                    />
                )}
            </div>
        </div>
    );
}

// Job Section Component
function JobSection({
    title,
    description,
    jobs,
    loading,
    emptyIcon = "clipboard",
    emptyMessage = "No jobs",
    color,
    highlight,
    showMore,
    delay = 0,
}: {
    title: string;
    description: string;
    jobs: JobWithPopulated[];
    loading: boolean;
    emptyIcon?: string;
    emptyMessage?: string;
    color?: "info" | "success";
    highlight?: boolean;
    showMore?: number;
    delay?: number;
}) {
    const colorClasses = {
        info: "border-[var(--nimmit-info)]/30 bg-[var(--nimmit-info-bg)]/30",
        success: "border-[var(--nimmit-success)]/30 bg-[var(--nimmit-success-bg)]/30",
    };

    return (
        <Card className={`border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-${delay} ${color ? colorClasses[color] : ""}`}>
            <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                    {highlight && jobs.length > 0 && <div className="w-2 h-2 rounded-full bg-[var(--nimmit-accent-primary)] animate-pulse" />}
                    <div>
                        <CardTitle className="text-lg font-display">{title} ({jobs.length})</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <SkeletonList />
                ) : jobs.length === 0 ? (
                    <EmptyState icon={emptyIcon} message={emptyMessage} />
                ) : (
                    <div className="space-y-3">
                        {jobs.map((job, i) => (
                            <JobCard key={job._id.toString()} job={job} index={i} />
                        ))}
                        {showMore && (
                            <p className="text-center text-sm text-[var(--nimmit-text-tertiary)] pt-2">
                                Showing 10 of {showMore} completed jobs
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Job Card
function JobCard({ job, index }: { job: JobWithPopulated; index: number }) {
    const hasRevision = job.status === "revision";

    return (
        <Link href={`/worker/jobs/${job._id}`} className="block group">
            <div
                className={`flex items-center justify-between p-4 rounded-xl border 
                    ${hasRevision ? "border-[var(--nimmit-error)]/30 bg-[var(--nimmit-error-bg)]/30" : "border-[var(--nimmit-border)] bg-[var(--nimmit-bg-elevated)]"}
                    hover:border-[var(--nimmit-accent-primary)]/30 hover:shadow-md transition-all duration-200`}
                style={{ animationDelay: `${index * 50}ms` }}
            >
                <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-medium text-[var(--nimmit-text-primary)] truncate group-hover:text-[var(--nimmit-accent-primary)] transition-colors">
                            {job.title}
                        </p>
                        {hasRevision && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold text-[var(--nimmit-error)] bg-[var(--nimmit-error)]/10 rounded">
                                ACTION NEEDED
                            </span>
                        )}
                    </div>
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
function EmptyState({ icon, message }: { icon: string; message: string }) {
    const icons: Record<string, React.ReactNode> = {
        inbox: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />,
        clipboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
    };

    return (
        <div className="text-center py-10">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[var(--nimmit-bg-secondary)] flex items-center justify-center">
                <svg className="w-7 h-7 text-[var(--nimmit-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {icons[icon] || icons.clipboard}
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
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-[var(--nimmit-border)]">
                    <div className="space-y-2 flex-1">
                        <div className="h-5 w-56 skeleton rounded" />
                        <div className="h-4 w-40 skeleton rounded" />
                    </div>
                    <div className="h-6 w-24 skeleton rounded-full" />
                </div>
            ))}
        </div>
    );
}

// Badges
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { className: string; label: string }> = {
        assigned: { className: "bg-[var(--nimmit-info-bg)] text-[var(--nimmit-info)] border-[var(--nimmit-info)]/20", label: "Assigned" },
        in_progress: { className: "bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)] border-[var(--nimmit-accent-primary)]/20", label: "In Progress" },
        review: { className: "bg-[var(--nimmit-info-bg)] text-[var(--nimmit-info)] border-[var(--nimmit-info)]/20", label: "In Review" },
        revision: { className: "bg-[var(--nimmit-error-bg)] text-[var(--nimmit-error)] border-[var(--nimmit-error)]/20", label: "Needs Revision" },
        completed: { className: "bg-[var(--nimmit-success-bg)] text-[var(--nimmit-success)] border-[var(--nimmit-success)]/20", label: "Completed" },
    };
    const { className, label } = config[status] || config.assigned;
    return <Badge variant="outline" className={`px-2.5 py-0.5 text-xs font-medium border rounded-full ${className}`}>{label}</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
    const config: Record<string, { className: string }> = {
        rush: { className: "bg-[var(--nimmit-error)]/10 text-[var(--nimmit-error)] border-[var(--nimmit-error)]/20" },
        express: { className: "bg-[var(--nimmit-warning-bg)] text-[var(--nimmit-warning)] border-[var(--nimmit-warning)]/20" },
    };
    return <Badge variant="outline" className={`px-2 py-0.5 text-xs border rounded-full ${config[priority]?.className}`}>{priority}</Badge>;
}
