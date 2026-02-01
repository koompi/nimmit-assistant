"use client";

import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { STANDARDIZED_SKILLS } from "@/lib/constants/skills";
import { CheckCircle, XCircle, Clock, Search, ExternalLink } from "lucide-react";

interface ApplicationData {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    portfolioUrl?: string;
    linkedinUrl?: string;
    primaryCategory: string;
    selectedSkills: string[];
    experienceYears: number;
    bio: string;
    motivation: string;
    status: "pending" | "approved" | "rejected";
    aiAnalysis?: {
        score: number;
        notes: string;
        suggestedLevel: "junior" | "mid" | "senior";
    };
    createdAt: string;
}

interface Stats {
    pending: number;
    approved: number;
    rejected: number;
}

const statusConfig = {
    pending: {
        label: "Pending",
        icon: Clock,
        color: "bg-[var(--nimmit-warning)]/10 text-[var(--nimmit-warning)] border-[var(--nimmit-warning)]/20"
    },
    approved: {
        label: "Approved",
        icon: CheckCircle,
        color: "bg-[var(--nimmit-success)]/10 text-[var(--nimmit-success)] border-[var(--nimmit-success)]/20"
    },
    rejected: {
        label: "Rejected",
        icon: XCircle,
        color: "bg-[var(--nimmit-error)]/10 text-[var(--nimmit-error)] border-[var(--nimmit-error)]/20"
    },
};

export default function AdminApplicationsPage() {
    const [applications, setApplications] = useState<ApplicationData[]>([]);
    const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("pending");
    const [search, setSearch] = useState("");
    const [selectedApp, setSelectedApp] = useState<ApplicationData | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchApplications();
    }, [filter, search]);

    async function fetchApplications() {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filter !== "all") params.set("status", filter);
            if (search) params.set("search", search);

            const response = await fetch(`/api/admin/applications?${params}`);
            const data = await response.json();

            if (data.success) {
                setApplications(data.data);
                setStats(data.stats);
            } else {
                toast.error(data.error || "Failed to load applications");
            }
        } catch (error) {
            console.error("Failed to fetch applications:", error);
            toast.error("Failed to load applications");
        } finally {
            setLoading(false);
        }
    }

    async function handleAction(applicationId: string, status: "approved" | "rejected") {
        setActionLoading(true);
        try {
            const response = await fetch("/api/admin/applications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ applicationId, status }),
            });
            const data = await response.json();

            if (data.success) {
                toast.success(`Application ${status}`);
                setSelectedApp(null);
                fetchApplications();
            } else {
                toast.error(data.error || "Failed to update application");
            }
        } catch (error) {
            console.error("Failed to update application:", error);
            toast.error("Failed to update application");
        } finally {
            setActionLoading(false);
        }
    }

    function getSkillLabel(skillId: string): string {
        return STANDARDIZED_SKILLS.find((s) => s.id === skillId)?.label || skillId;
    }

    return (
        <div className="space-y-4">
            {/* Compact Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-display font-semibold text-[var(--nimmit-text-primary)]">
                        Application Review
                    </h1>
                    <p className="text-sm text-[var(--nimmit-text-tertiary)]">
                        Review worker applications ({applications.length})
                    </p>
                </div>
            </div>

            {/* Compact Stats Bar */}
            <div className="flex items-center gap-6 py-3 px-4 bg-[var(--nimmit-bg-elevated)] rounded-lg border border-[var(--nimmit-border)]">
                <StatItem
                    label="Pending"
                    value={stats.pending}
                    color="warning"
                    onClick={() => setFilter("pending")}
                    active={filter === "pending"}
                />
                <div className="w-px h-8 bg-[var(--nimmit-border)]" />
                <StatItem
                    label="Approved"
                    value={stats.approved}
                    color="success"
                    onClick={() => setFilter("approved")}
                    active={filter === "approved"}
                />
                <div className="w-px h-8 bg-[var(--nimmit-border)]" />
                <StatItem
                    label="Rejected"
                    value={stats.rejected}
                    color="error"
                    onClick={() => setFilter("rejected")}
                    active={filter === "rejected"}
                />
                <div className="flex-1" />

                {/* Search in Stats Bar */}
                <div className="relative w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--nimmit-text-tertiary)]" />
                    <Input
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-8 pl-8 text-xs bg-[var(--nimmit-bg-secondary)] border-0 focus-visible:ring-1 focus-visible:ring-[var(--nimmit-border)]"
                    />
                </div>
            </div>

            {/* Applications List */}
            <div className="bg-[var(--nimmit-bg-elevated)] rounded-lg border border-[var(--nimmit-border)]">
                <div className="px-4 py-3 border-b border-[var(--nimmit-border)] bg-[var(--nimmit-bg-secondary)]/30 grid grid-cols-12 gap-4 text-xs font-medium text-[var(--nimmit-text-tertiary)] uppercase tracking-wider">
                    <div className="col-span-4">Applicant</div>
                    <div className="col-span-3">Category</div>
                    <div className="col-span-2">Skills</div>
                    <div className="col-span-1">AI Score</div>
                    <div className="col-span-2 text-right">Status</div>
                </div>
                <div className="divide-y divide-[var(--nimmit-border)]">
                    {loading ? (
                        <SkeletonRows count={5} />
                    ) : applications.length === 0 ? (
                        <div className="text-center py-8 text-sm text-[var(--nimmit-text-tertiary)]">
                            No {filter !== "all" ? filter : ""} applications found
                        </div>
                    ) : (
                        applications.map((app) => (
                            <ApplicationRow key={app._id} app={app} onClick={() => setSelectedApp(app)} />
                        ))
                    )}
                </div>
            </div>

            {/* Application Detail Dialog remains largely the same but cleaned up */}
            <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)]">
                    {selectedApp && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="font-display text-xl">
                                    {selectedApp.firstName} {selectedApp.lastName}
                                </DialogTitle>
                                <DialogDescription className="flex items-center gap-2 text-xs">
                                    <span>{selectedApp.email}</span>
                                    <span>•</span>
                                    <span>{selectedApp.phone}</span>
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 mt-2">
                                {/* Compact Info Grid */}
                                <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-[var(--nimmit-bg-secondary)]/50 border border-[var(--nimmit-border)]">
                                    <div>
                                        <span className="text-xs text-[var(--nimmit-text-tertiary)] block">Category</span>
                                        <span className="text-sm font-medium">{selectedApp.primaryCategory}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-[var(--nimmit-text-tertiary)] block">Experience</span>
                                        <span className="text-sm font-medium">{selectedApp.experienceYears} years</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-xs text-[var(--nimmit-text-tertiary)] block mb-1">Links</span>
                                        <div className="flex gap-4">
                                            {selectedApp.linkedinUrl && (
                                                <a href={selectedApp.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[var(--nimmit-accent-primary)] hover:underline">
                                                    <ExternalLink className="h-3 w-3" /> LinkedIn
                                                </a>
                                            )}
                                            {selectedApp.portfolioUrl && (
                                                <a href={selectedApp.portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[var(--nimmit-accent-primary)] hover:underline">
                                                    <ExternalLink className="h-3 w-3" /> Portfolio
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* AI Analysis - Compact */}
                                {selectedApp.aiAnalysis && (
                                    <div className="flex items-start gap-4 p-3 rounded-lg border border-[var(--nimmit-border)]">
                                        <div className={`p-2 rounded-lg text-center min-w-[60px] ${selectedApp.aiAnalysis.score > 0.7 ? "bg-[var(--nimmit-success)]/10 text-[var(--nimmit-success)]" : "bg-[var(--nimmit-warning)]/10 text-[var(--nimmit-warning)]"}`}>
                                            <div className="text-lg font-bold">{Math.round(selectedApp.aiAnalysis.score * 100)}%</div>
                                            <div className="text-[10px] uppercase font-bold">{selectedApp.aiAnalysis.suggestedLevel}</div>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xs font-semibold uppercase text-[var(--nimmit-text-tertiary)] mb-1">AI Assessment</h4>
                                            <p className="text-sm text-[var(--nimmit-text-secondary)]">{selectedApp.aiAnalysis.notes}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Skills */}
                                <div>
                                    <h4 className="text-xs font-semibold uppercase text-[var(--nimmit-text-tertiary)] mb-2">Skills</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedApp.selectedSkills.map((skillId) => (
                                            <Badge key={skillId} variant="outline" className="text-xs font-normal">
                                                {getSkillLabel(skillId)}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Bio & Motivation */}
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-xs font-semibold uppercase text-[var(--nimmit-text-tertiary)] mb-1">Bio</h4>
                                        <p className="text-sm text-[var(--nimmit-text-secondary)] leading-relaxed">{selectedApp.bio}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-semibold uppercase text-[var(--nimmit-text-tertiary)] mb-1">Motivation</h4>
                                        <p className="text-sm text-[var(--nimmit-text-secondary)] leading-relaxed">{selectedApp.motivation}</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                {selectedApp.status === "pending" && (
                                    <div className="flex gap-3 pt-4 border-t border-[var(--nimmit-border)]">
                                        <Button
                                            onClick={() => handleAction(selectedApp._id, "rejected")}
                                            variant="outline"
                                            className="flex-1 border-[var(--nimmit-error)] text-[var(--nimmit-error)] hover:bg-[var(--nimmit-error)]/10"
                                            disabled={actionLoading}
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Reject
                                        </Button>
                                        <Button
                                            onClick={() => handleAction(selectedApp._id, "approved")}
                                            className="flex-1 bg-[var(--nimmit-success)] hover:bg-[var(--nimmit-success)]/90 text-white"
                                            disabled={actionLoading}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Approve
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Compact Stat Item
function StatItem({ label, value, color, onClick, active }: {
    label: string;
    value: number;
    color: "warning" | "success" | "error";
    onClick: () => void;
    active: boolean;
}) {
    const colors = {
        warning: "text-[var(--nimmit-warning)]",
        success: "text-[var(--nimmit-success)]",
        error: "text-[var(--nimmit-error)]",
    };

    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-100 ${active ? "opacity-100" : "opacity-50 hover:opacity-80"}`}
        >
            <span className={`text-2xl font-semibold font-display ${colors[color]}`}>
                {value}
            </span>
            <span className="text-xs text-[var(--nimmit-text-tertiary)] uppercase font-semibold">{label}</span>
        </div>
    );
}

// Dense Application Row
function ApplicationRow({ app, onClick }: { app: ApplicationData; onClick: () => void }) {
    const StatusIcon = statusConfig[app.status].icon;

    return (
        <div
            onClick={onClick}
            className="grid grid-cols-12 gap-4 px-4 py-2.5 items-center hover:bg-[var(--nimmit-bg-secondary)] transition-colors cursor-pointer group border-l-2 border-transparent hover:border-l-[var(--nimmit-accent-primary)]"
        >
            {/* Applicant */}
            <div className="col-span-4 flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-[var(--nimmit-bg-secondary)] flex items-center justify-center shrink-0 text-xs font-medium text-[var(--nimmit-text-secondary)]">
                    {app.firstName[0]}{app.lastName[0]}
                </div>
                <div className="truncate">
                    <div className="text-sm font-medium text-[var(--nimmit-text-primary)] truncate">
                        {app.firstName} {app.lastName}
                    </div>
                    <div className="text-xs text-[var(--nimmit-text-tertiary)] truncate">
                        {app.email}
                    </div>
                </div>
            </div>

            {/* Category */}
            <div className="col-span-3 text-xs text-[var(--nimmit-text-primary)]">
                {app.primaryCategory}
                <span className="text-[var(--nimmit-text-tertiary)] ml-1">({app.experienceYears}y)</span>
            </div>

            {/* Skills */}
            <div className="col-span-2 flex items-center gap-1 overflow-hidden">
                {app.selectedSkills.slice(0, 1).map((s) => (
                    <Badge key={s} variant="outline" className="h-5 px-1.5 text-[10px] font-normal truncate max-w-[80px]">
                        {s}
                    </Badge>
                ))}
                {app.selectedSkills.length > 1 && (
                    <span className="text-[10px] text-[var(--nimmit-text-tertiary)]">+{app.selectedSkills.length - 1}</span>
                )}
            </div>

            {/* AI Score */}
            <div className="col-span-1">
                {app.aiAnalysis?.score && (
                    <span className={`text-xs font-medium ${app.aiAnalysis.score > 0.7 ? "text-[var(--nimmit-success)]" : "text-[var(--nimmit-warning)]"}`}>
                        {Math.round(app.aiAnalysis.score * 100)}%
                    </span>
                )}
            </div>

            {/* Status */}
            <div className="col-span-2 flex justify-end">
                <Badge className={`h-5 px-2 text-[10px] font-medium border ${statusConfig[app.status].color}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig[app.status].label}
                </Badge>
            </div>
        </div>
    );
}

// Skeleton Rows
function SkeletonRows({ count }: { count: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-[var(--nimmit-border)]">
                    <div className="h-5 bg-[var(--nimmit-bg-secondary)] rounded animate-pulse w-full" />
                </div>
            ))}
        </>
    );
}
