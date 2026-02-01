"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    { value: "all", label: "Filter: All", icon: "📋" },
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

    // Fetch all jobs initially to allow fast tab switching
    useEffect(() => {
        async function fetchJobs() {
            setLoading(true);
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

    // Derived Lists
    const pendingJobs = jobs.filter((j) => j.status === "pending");
    const activeJobs = jobs.filter((j) => ["assigned", "in_progress", "review", "revision"].includes(j.status));
    const completedJobs = jobs.filter((j) => j.status === "completed");

    // "All Jobs" Tab - Filtered by the dropdown
    const filteredAllJobs = statusFilter === "all"
        ? jobs
        : jobs.filter(j => j.status === statusFilter);

    return (
        <div className="space-y-4">
            {/* Page Header */}
            <div className="flex items-center justify-between pb-2">
                <div>
                    <h1 className="text-2xl font-display font-medium text-[var(--nimmit-text-primary)] tracking-tight">
                        Jobs Management
                    </h1>
                    <p className="text-sm text-[var(--nimmit-text-tertiary)] mt-1">
                        Track, assign, and review all tasks across the platform
                    </p>
                </div>
                {/* Global Status Filter - Primarily useful for the "All Jobs" tab */}
                <div className="flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] h-10 rounded-full border-gray-200 bg-white shadow-sm">
                            <SelectValue placeholder="Filter Status" />
                        </SelectTrigger>
                        <SelectContent align="end">
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

            {/* Main Floating Panel with Tabs */}
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-200/60 overflow-hidden min-h-[600px] flex flex-col">
                <Tabs defaultValue="active" className="w-full flex flex-col flex-1">

                    {/* Tabs Header */}
                    <div className="px-6 py-2 border-b border-gray-100 bg-gray-50/30 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <TabsList className="bg-transparent p-0 h-auto gap-2">
                            <TabsTrigger value="active" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-full px-4 py-2 border border-transparent data-[state=active]:border-gray-200 transition-all">
                                Active <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100">{activeJobs.length}</Badge>
                            </TabsTrigger>

                            <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-full px-4 py-2 border border-transparent data-[state=active]:border-gray-200 transition-all relative">
                                Unassigned
                                {pendingJobs.length > 0 && <Badge className="ml-2 bg-amber-500 hover:bg-amber-600 border-none text-white">{pendingJobs.length}</Badge>}
                            </TabsTrigger>

                            <TabsTrigger value="completed" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-full px-4 py-2 border border-transparent data-[state=active]:border-gray-200 transition-all">
                                Completed <span className="ml-2 text-xs text-gray-500 font-normal">({completedJobs.length})</span>
                            </TabsTrigger>

                            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-full px-4 py-2 border border-transparent data-[state=active]:border-gray-200 transition-all">
                                All Jobs
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 bg-white">
                        {/* Active Jobs Tab */}
                        <TabsContent value="active" className="m-0 h-full">
                            <JobList jobs={activeJobs} loading={loading} emptyMessage="No active jobs at the moment." />
                        </TabsContent>

                        {/* Unassigned Tab */}
                        <TabsContent value="pending" className="m-0 h-full">
                            {pendingJobs.length > 0 && (
                                <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 text-amber-800 text-sm flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                    <strong>Action Required:</strong> These jobs need to be assigned to a worker.
                                </div>
                            )}
                            <JobList jobs={pendingJobs} loading={loading} emptyMessage="All jobs satisfy sorting! No unassigned tasks." urgent />
                        </TabsContent>

                        {/* Completed Tab */}
                        <TabsContent value="completed" className="m-0 h-full">
                            <JobList jobs={completedJobs} loading={loading} emptyMessage="No completed jobs yet." />
                        </TabsContent>

                        {/* All Jobs Tab */}
                        <TabsContent value="all" className="m-0 h-full">
                            {statusFilter !== "all" && (
                                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
                                    Filtering view by: <span className="font-medium text-gray-900">{STATUS_OPTIONS.find(o => o.value === statusFilter)?.label}</span>
                                </div>
                            )}
                            <JobList jobs={filteredAllJobs} loading={loading} emptyMessage="No jobs found matching the filter." />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}

// Reusable List Component
function JobList({ jobs, loading, emptyMessage, urgent }: { jobs: JobWithPopulated[]; loading: boolean; emptyMessage: string; urgent?: boolean }) {
    if (loading) return (
        <div className="divide-y divide-gray-100">
            <SkeletonRows count={5} />
        </div>
    );

    if (jobs.length === 0) return (
        <EmptyRow message={emptyMessage} />
    );

    return (
        <div className="divide-y divide-gray-100">
            {jobs.map((job) => (
                <JobRow key={job._id.toString()} job={job} urgent={urgent} />
            ))}
        </div>
    );
}

// Dense Job Row
function JobRow({ job, urgent }: { job: JobWithPopulated; urgent?: boolean }) {
    return (
        <Link href={`/admin/jobs/${job._id}`} className={`block hover:bg-gray-50 transition-colors group ${urgent ? "bg-amber-50/30 hover:bg-amber-50/60" : ""}`}>
            <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                    {/* Icon Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${urgent ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                        {job.title.charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">{job.title}</p>
                            {urgent && <Badge variant="outline" className="border-amber-200 text-amber-700 text-[10px] h-5">Unassigned</Badge>}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                {job.category}
                            </span>
                            <span className="text-gray-300">|</span>
                            <span>Client: <span className="text-gray-700">{job.clientId.profile.firstName} {job.clientId.profile.lastName}</span></span>
                            {job.workerId && (
                                <>
                                    <span className="text-gray-300">|</span>
                                    <span>Worker: <span className="text-blue-600 font-medium">{job.workerId.profile.firstName}</span></span>
                                </>
                            )}
                            <span className="text-gray-300">|</span>
                            <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {job.priority !== "standard" && <PriorityBadge priority={job.priority} />}
                    <StatusBadge status={job.status} />
                    <div className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// Empty Row
function EmptyRow({ message }: { message: string }) {
    return (
        <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-50 rounded-full flex items-center justify-center text-2xl">🍃</div>
            <p className="text-sm text-gray-500">{message}</p>
        </div>
    );
}

// Skeleton Rows
function SkeletonRows({ count }: { count: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4">
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
                        <div className="h-3 w-32 bg-gray-50 rounded animate-pulse" />
                    </div>
                    <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
                </div>
            ))}
        </>
    );
}

// Status Badge - Refined for White Panel
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { className: string; label: string }> = {
        pending: { className: "bg-gray-100 text-gray-600", label: "Unassigned" },
        assigned: { className: "bg-blue-50 text-blue-600", label: "Assigned" },
        in_progress: { className: "bg-blue-100 text-blue-700", label: "In Progress" },
        review: { className: "bg-purple-50 text-purple-600", label: "Review" },
        revision: { className: "bg-amber-50 text-amber-600", label: "Revision" },
        completed: { className: "bg-green-50 text-green-700", label: "Done" },
        cancelled: { className: "bg-gray-50 text-gray-400 decoration-slice line-through", label: "Cancelled" },
    };
    const { className, label } = config[status] || config.pending;
    return <span className={`px-2.5 py-1 text-[11px] font-medium rounded-full ${className}`}>{label}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
    const config: Record<string, string> = {
        rush: "bg-red-50 text-red-600 border border-red-100",
        express: "bg-amber-50 text-amber-600 border border-amber-100",
    };
    return <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${config[priority]}`}>{priority}</span>;
}
