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
import { CheckCircle, XCircle, Clock, Search, User, Briefcase, ExternalLink } from "lucide-react";

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
        color: "bg-[var(--nimmit-warning-bg)] text-[var(--nimmit-warning)]"
    },
    approved: {
        label: "Approved",
        icon: CheckCircle,
        color: "bg-[var(--nimmit-success-bg)] text-[var(--nimmit-success)]"
    },
    rejected: {
        label: "Rejected",
        icon: XCircle,
        color: "bg-[var(--nimmit-error-bg)] text-[var(--nimmit-error)]"
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
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-display font-medium text-[var(--nimmit-text-primary)]">
                    Application Review
                </h1>
                <p className="text-[var(--nimmit-text-secondary)] mt-1">
                    Review and manage worker applications
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                    className={`cursor-pointer transition-all border-2 ${filter === "pending" ? "border-[var(--nimmit-warning)]" : "border-transparent"}`}
                    onClick={() => setFilter("pending")}
                >
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--nimmit-text-tertiary)]">Pending</p>
                                <p className="text-3xl font-display font-medium text-[var(--nimmit-warning)]">
                                    {stats.pending}
                                </p>
                            </div>
                            <Clock className="h-8 w-8 text-[var(--nimmit-warning)]" />
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={`cursor-pointer transition-all border-2 ${filter === "approved" ? "border-[var(--nimmit-success)]" : "border-transparent"}`}
                    onClick={() => setFilter("approved")}
                >
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--nimmit-text-tertiary)]">Approved</p>
                                <p className="text-3xl font-display font-medium text-[var(--nimmit-success)]">
                                    {stats.approved}
                                </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-[var(--nimmit-success)]" />
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={`cursor-pointer transition-all border-2 ${filter === "rejected" ? "border-[var(--nimmit-error)]" : "border-transparent"}`}
                    onClick={() => setFilter("rejected")}
                >
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--nimmit-text-tertiary)]">Rejected</p>
                                <p className="text-3xl font-display font-medium text-[var(--nimmit-error)]">
                                    {stats.rejected}
                                </p>
                            </div>
                            <XCircle className="h-8 w-8 text-[var(--nimmit-error)]" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--nimmit-text-tertiary)]" />
                <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-[var(--nimmit-bg-elevated)]"
                />
            </div>

            {/* Applications List */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-display">Applications</CardTitle>
                    <CardDescription>
                        {applications.length} {filter !== "all" ? filter : ""} applications
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nimmit-accent-primary)]"></div>
                        </div>
                    ) : applications.length === 0 ? (
                        <div className="text-center py-12 text-[var(--nimmit-text-tertiary)]">
                            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No {filter !== "all" ? filter : ""} applications found</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {applications.map((app) => {
                                const StatusIcon = statusConfig[app.status].icon;
                                return (
                                    <div
                                        key={app._id}
                                        className="flex items-center justify-between p-4 rounded-lg border border-[var(--nimmit-border)] hover:border-[var(--nimmit-border-hover)] transition-colors cursor-pointer"
                                        onClick={() => setSelectedApp(app)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-[var(--nimmit-bg-secondary)] flex items-center justify-center text-lg font-medium text-[var(--nimmit-text-secondary)]">
                                                {app.firstName[0]}{app.lastName[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium text-[var(--nimmit-text-primary)]">
                                                    {app.firstName} {app.lastName}
                                                </p>
                                                <p className="text-sm text-[var(--nimmit-text-tertiary)]">
                                                    {app.email}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="hidden md:flex items-center gap-2">
                                                <Briefcase className="h-4 w-4 text-[var(--nimmit-text-tertiary)]" />
                                                <span className="text-sm text-[var(--nimmit-text-secondary)]">
                                                    {app.primaryCategory}
                                                </span>
                                            </div>

                                            {app.aiAnalysis?.score && (
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)]"
                                                >
                                                    AI: {Math.round(app.aiAnalysis.score * 100)}%
                                                </Badge>
                                            )}

                                            <Badge className={statusConfig[app.status].color}>
                                                <StatusIcon className="h-3 w-3 mr-1" />
                                                {statusConfig[app.status].label}
                                            </Badge>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Application Detail Dialog */}
            <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    {selectedApp && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="font-display text-xl">
                                    {selectedApp.firstName} {selectedApp.lastName}
                                </DialogTitle>
                                <DialogDescription className="flex items-center gap-2">
                                    <span>{selectedApp.email}</span>
                                    <span>•</span>
                                    <span>{selectedApp.phone}</span>
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 mt-4">
                                {/* Links */}
                                <div className="flex gap-4">
                                    {selectedApp.linkedinUrl && (
                                        <a
                                            href={selectedApp.linkedinUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-sm text-[var(--nimmit-accent-primary)] hover:underline"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            LinkedIn
                                        </a>
                                    )}
                                    {selectedApp.portfolioUrl && (
                                        <a
                                            href={selectedApp.portfolioUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-sm text-[var(--nimmit-accent-primary)] hover:underline"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            Portfolio
                                        </a>
                                    )}
                                </div>

                                {/* Experience & Skills */}
                                <div>
                                    <h4 className="text-sm font-medium text-[var(--nimmit-text-secondary)] mb-2">
                                        {selectedApp.experienceYears} years • {selectedApp.primaryCategory}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedApp.selectedSkills.map((skillId) => (
                                            <Badge key={skillId} variant="outline">
                                                {getSkillLabel(skillId)}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Bio */}
                                <div>
                                    <h4 className="text-sm font-medium text-[var(--nimmit-text-secondary)] mb-2">Bio</h4>
                                    <p className="text-[var(--nimmit-text-primary)] text-sm leading-relaxed">
                                        {selectedApp.bio}
                                    </p>
                                </div>

                                {/* Motivation */}
                                <div>
                                    <h4 className="text-sm font-medium text-[var(--nimmit-text-secondary)] mb-2">
                                        Why Nimmit?
                                    </h4>
                                    <p className="text-[var(--nimmit-text-primary)] text-sm leading-relaxed">
                                        {selectedApp.motivation}
                                    </p>
                                </div>

                                {/* AI Analysis */}
                                {selectedApp.aiAnalysis && (
                                    <Card className="bg-[var(--nimmit-bg-secondary)]">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-display">AI Assessment</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="text-2xl font-display font-medium text-[var(--nimmit-accent-primary)]">
                                                    {Math.round(selectedApp.aiAnalysis.score * 100)}%
                                                </div>
                                                <Badge variant="outline">{selectedApp.aiAnalysis.suggestedLevel}</Badge>
                                            </div>
                                            <p className="text-sm text-[var(--nimmit-text-secondary)]">
                                                {selectedApp.aiAnalysis.notes}
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Actions */}
                                {selectedApp.status === "pending" && (
                                    <div className="flex gap-3 pt-4 border-t border-[var(--nimmit-border)]">
                                        <Button
                                            onClick={() => handleAction(selectedApp._id, "rejected")}
                                            variant="outline"
                                            className="flex-1 border-[var(--nimmit-error)] text-[var(--nimmit-error)] hover:bg-[var(--nimmit-error-bg)]"
                                            disabled={actionLoading}
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Reject
                                        </Button>
                                        <Button
                                            onClick={() => handleAction(selectedApp._id, "approved")}
                                            className="flex-1 bg-[var(--nimmit-success)] hover:bg-[var(--nimmit-success)]/90"
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
