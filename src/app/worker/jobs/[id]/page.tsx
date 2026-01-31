"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { FileList } from "@/components/job/file-list";
import { FileUpload } from "@/components/job/file-upload";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { Job, JobMessage } from "@/types";

interface ProgressUpdate {
    id: string;
    content: string;
    percentage?: number;
    createdAt: Date;
}

interface ConfidenceFlag {
    flagged: boolean;
    reason?: string;
    flaggedAt?: Date;
}

interface UploadedFile {
    id: string;
    name: string;
    url: string;
    key: string;
    size: number;
    mimeType: string;
}

interface JobWithPopulated extends Omit<Job, "clientId" | "messages"> {
    clientId: { _id: string; profile: { firstName: string; lastName: string }; email: string };
    messages: Array<JobMessage & { senderRole: string }>;
    progressUpdates?: ProgressUpdate[];
    confidenceFlag?: ConfidenceFlag;
}

export default function WorkerJobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [job, setJob] = useState<JobWithPopulated | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [uploadedDeliverables, setUploadedDeliverables] = useState<UploadedFile[]>([]);

    useEffect(() => {
        async function fetchJob() {
            try {
                const response = await fetch(`/api/jobs/${params.id}`);
                const data = await response.json();
                if (data.success) setJob(data.data);
                else setError(data.error?.message || "Failed to load job");
            } catch {
                setError("Failed to load job");
            } finally {
                setLoading(false);
            }
        }
        if (params.id) fetchJob();
    }, [params.id]);

    const updateStatus = async (newStatus: string) => {
        setUpdating(true);
        try {
            const response = await fetch(`/api/jobs/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "updateStatus", status: newStatus }),
            });
            const data = await response.json();
            if (data.success) {
                setJob(data.data);
                toast.success("Status updated successfully");
            } else {
                toast.error(data.error?.message || "Failed to update status");
            }
        } catch {
            toast.error("Failed to update status");
        } finally {
            setUpdating(false);
        }
    };

    const sendMessage = async () => {
        if (!message.trim()) return;
        try {
            const response = await fetch(`/api/jobs/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "addMessage", message: message.trim() }),
            });
            const data = await response.json();
            if (data.success) {
                setJob(data.data);
                setMessage("");
                toast.success("Message sent");
            } else {
                toast.error(data.error?.message || "Failed to send message");
            }
        } catch {
            toast.error("Failed to send message");
        }
    };

    const submitDeliverables = async () => {
        if (uploadedDeliverables.length === 0) {
            toast.error("Please upload at least one deliverable");
            return;
        }
        setUpdating(true);
        try {
            const response = await fetch(`/api/jobs/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "addDeliverables",
                    deliverables: uploadedDeliverables.map((f) => ({ ...f, version: 1, uploadedAt: new Date() })),
                }),
            });
            const data = await response.json();
            if (data.success) {
                await updateStatus("review");
                setUploadedDeliverables([]);
            } else {
                toast.error(data.error?.message || "Failed to submit deliverables");
            }
        } catch {
            toast.error("Failed to submit deliverables");
        } finally {
            setUpdating(false);
        }
    };

    // Loading State
    if (loading) return <LoadingSkeleton />;

    // Error State
    if (error || !job) {
        return (
            <div className="min-h-screen bg-[var(--nimmit-bg-primary)] flex items-center justify-center p-6">
                <div className="max-w-md text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--nimmit-error-bg)] flex items-center justify-center">
                        <svg className="w-8 h-8 text-[var(--nimmit-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-display font-semibold text-[var(--nimmit-text-primary)] mb-2">{error || "Job not found"}</h2>
                    <Button variant="outline" onClick={() => router.back()} className="border-[var(--nimmit-border)]">Go Back</Button>
                </div>
            </div>
        );
    }

    const nextAction = getNextAction(job.status);
    const isRevision = job.status === "revision";

    return (
        <div className="min-h-screen bg-[var(--nimmit-bg-primary)]">
            <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
                {/* Header */}
                <div className="animate-fade-up">
                    <Link href="/worker/jobs" className="inline-flex items-center gap-1 text-sm text-[var(--nimmit-text-secondary)] hover:text-[var(--nimmit-accent-primary)] mb-4 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back to Jobs
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                {job.priority !== "standard" && <PriorityBadge priority={job.priority} />}
                                <StatusBadge status={job.status} />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-display font-semibold text-[var(--nimmit-text-primary)]">{job.title}</h1>
                            <p className="text-[var(--nimmit-text-secondary)] mt-1">
                                From <span className="font-medium text-[var(--nimmit-text-primary)]">{job.clientId.profile.firstName} {job.clientId.profile.lastName}</span>
                            </p>
                        </div>
                        {nextAction && (
                            <Button onClick={() => updateStatus(nextAction.newStatus)} disabled={updating} className="bg-[var(--nimmit-accent-primary)] hover:bg-[var(--nimmit-accent-primary-hover)] shrink-0">
                                {updating ? "Updating..." : nextAction.label}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Revision Alert */}
                {isRevision && (
                    <Alert className="border-[var(--nimmit-error)]/30 bg-[var(--nimmit-error-bg)]/50 animate-fade-up stagger-1">
                        <svg className="w-5 h-5 text-[var(--nimmit-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <AlertDescription className="text-[var(--nimmit-error)] font-medium">
                            Revision requested! Please review client feedback and update your deliverables.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Main Content Grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description */}
                        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-2">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg font-display flex items-center gap-2">
                                    <svg className="w-5 h-5 text-[var(--nimmit-accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    Task Description
                                </CardTitle>
                            </CardHeader>
                            <CardContent><p className="whitespace-pre-wrap text-[var(--nimmit-text-primary)]">{job.description}</p></CardContent>
                        </Card>

                        {/* Context from Past Work */}
                        {job.contextFromPastWork && (
                            <Card className="border-[var(--nimmit-info)]/30 bg-[var(--nimmit-info-bg)]/30 shadow-sm animate-fade-up stagger-3">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg font-display text-[var(--nimmit-info)] flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Context from Previous Work
                                    </CardTitle>
                                    <CardDescription>Relevant insights from this client&apos;s past jobs</CardDescription>
                                </CardHeader>
                                <CardContent><p className="whitespace-pre-wrap text-[var(--nimmit-info)]">{job.contextFromPastWork}</p></CardContent>
                            </Card>
                        )}

                        {/* Reference Files */}
                        {job.files.length > 0 && (
                            <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-4">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg font-display flex items-center gap-2">
                                        <svg className="w-5 h-5 text-[var(--nimmit-accent-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                        Reference Files
                                    </CardTitle>
                                    <CardDescription>Files provided by the client</CardDescription>
                                </CardHeader>
                                <CardContent><FileList files={job.files} emptyMessage="No reference files" /></CardContent>
                            </Card>
                        )}

                        {/* Upload Deliverables */}
                        {["in_progress", "revision"].includes(job.status) && (
                            <Card className="border-[var(--nimmit-accent-primary)]/30 shadow-sm animate-fade-up stagger-5">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg font-display text-[var(--nimmit-accent-primary)] flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        Upload Deliverables
                                    </CardTitle>
                                    <CardDescription>Upload your completed work</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FileUpload jobId={params.id as string} onFilesUploaded={setUploadedDeliverables} maxFiles={10} />
                                    {uploadedDeliverables.length > 0 && (
                                        <Button onClick={submitDeliverables} disabled={updating} className="w-full bg-[var(--nimmit-accent-primary)] hover:bg-[var(--nimmit-accent-primary-hover)]">
                                            {updating ? "Submitting..." : "Submit for Review"}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Submitted Deliverables */}
                        {job.deliverables.length > 0 && (
                            <Card className="border-[var(--nimmit-success)]/30 bg-[var(--nimmit-success-bg)]/30 shadow-sm animate-fade-up stagger-6">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg font-display text-[var(--nimmit-success)] flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Submitted Deliverables
                                    </CardTitle>
                                </CardHeader>
                                <CardContent><FileList files={job.deliverables} emptyMessage="No deliverables yet" /></CardContent>
                            </Card>
                        )}

                        {/* Messages */}
                        <MessagesCard job={job} message={message} setMessage={setMessage} sendMessage={sendMessage} />
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <DetailsCard job={job} />
                        <ClientCard client={job.clientId} />

                        {/* Progress Updates */}
                        {["assigned", "in_progress", "revision"].includes(job.status) && (
                            <ProgressCard jobId={params.id as string} updates={job.progressUpdates || []} onUpdateAdded={(update) => setJob(prev => prev ? {...prev, progressUpdates: [...(prev.progressUpdates || []), update]} : null)} />
                        )}

                        {/* Confidence Flag */}
                        {["assigned", "in_progress"].includes(job.status) && (
                            <ConfidenceFlagCard jobId={params.id as string} flag={job.confidenceFlag} onFlagged={(flag) => setJob(prev => prev ? {...prev, confidenceFlag: flag} : null)} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper functions
function getNextAction(status: string) {
    const actions: Record<string, { label: string; newStatus: string }> = {
        assigned: { label: "Start Working", newStatus: "in_progress" },
        in_progress: { label: "Submit for Review", newStatus: "review" },
        revision: { label: "Resume Work", newStatus: "in_progress" },
    };
    return actions[status] || null;
}

// Loading Skeleton
function LoadingSkeleton() {
    return (
        <div className="min-h-screen bg-[var(--nimmit-bg-primary)]">
            <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
                <div className="space-y-4"><div className="h-4 w-24 skeleton rounded" /><div className="h-8 w-96 skeleton rounded" /><div className="h-4 w-48 skeleton rounded" /></div>
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">{[1, 2].map((i) => <div key={i} className="rounded-xl border border-[var(--nimmit-border)] p-6"><div className="h-5 w-32 skeleton rounded mb-4" /><div className="space-y-2"><div className="h-4 w-full skeleton rounded" /><div className="h-4 w-3/4 skeleton rounded" /></div></div>)}</div>
                    <div className="space-y-6">{[1, 2].map((i) => <div key={i} className="rounded-xl border border-[var(--nimmit-border)] p-6"><div className="h-5 w-24 skeleton rounded mb-4" /><div className="space-y-2"><div className="h-4 w-full skeleton rounded" /><div className="h-4 w-2/3 skeleton rounded" /></div></div>)}</div>
                </div>
            </div>
        </div>
    );
}

// Messages Card
function MessagesCard({ job, message, setMessage, sendMessage }: { job: JobWithPopulated; message: string; setMessage: (m: string) => void; sendMessage: () => void }) {
    const canMessage = ["assigned", "in_progress", "revision", "review"].includes(job.status);

    return (
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-7">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                    <svg className="w-5 h-5 text-[var(--nimmit-accent-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Messages
                </CardTitle>
                <CardDescription>Communication with the client</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {job.messages.length === 0 ? (
                    <div className="text-center py-8"><p className="text-[var(--nimmit-text-tertiary)]">No messages yet</p></div>
                ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                        {job.messages.map((msg) => (
                            <div key={msg.id} className={`p-3 rounded-xl ${msg.senderRole === "worker" ? "bg-[var(--nimmit-accent-primary)]/10 ml-8 border border-[var(--nimmit-accent-primary)]/20" : "bg-[var(--nimmit-bg-secondary)] mr-8 border border-[var(--nimmit-border)]"}`}>
                                <div className="flex justify-between text-xs text-[var(--nimmit-text-tertiary)] mb-1">
                                    <span className={`font-medium capitalize ${msg.senderRole === "worker" ? "text-[var(--nimmit-accent-primary)]" : ""}`}>{msg.senderRole}</span>
                                    <span>{new Date(msg.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-[var(--nimmit-text-primary)]">{msg.message}</p>
                            </div>
                        ))}
                    </div>
                )}
                {canMessage && (
                    <div className="flex gap-2 pt-4 border-t border-[var(--nimmit-border)]">
                        <Textarea placeholder="Type a message..." value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="border-[var(--nimmit-border)] focus:border-[var(--nimmit-accent-primary)]" />
                        <Button onClick={sendMessage} disabled={!message.trim()} className="bg-[var(--nimmit-accent-primary)] hover:bg-[var(--nimmit-accent-primary-hover)] shrink-0">Send</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Details Card
function DetailsCard({ job }: { job: JobWithPopulated }) {
    const details = [
        { label: "Category", value: job.category },
        { label: "Created", value: new Date(job.createdAt).toLocaleDateString() },
        job.assignedAt && { label: "Assigned", value: new Date(job.assignedAt).toLocaleDateString() },
        job.startedAt && { label: "Started", value: new Date(job.startedAt).toLocaleDateString() },
        job.estimatedHours && { label: "Est. Hours", value: `${job.estimatedHours} hours` },
    ].filter(Boolean) as Array<{ label: string; value: string }>;

    return (
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-3">
            <CardHeader className="pb-3"><CardTitle className="text-lg font-display">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
                {details.map((d) => (
                    <div key={d.label} className="flex justify-between"><span className="text-sm text-[var(--nimmit-text-tertiary)]">{d.label}</span><span className="text-sm font-medium text-[var(--nimmit-text-primary)] capitalize">{d.value}</span></div>
                ))}
            </CardContent>
        </Card>
    );
}

// Client Card
function ClientCard({ client }: { client: JobWithPopulated["clientId"] }) {
    return (
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-4">
            <CardHeader className="pb-3"><CardTitle className="text-lg font-display">Client</CardTitle></CardHeader>
            <CardContent>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--nimmit-accent-primary)]/10 flex items-center justify-center">
                        <span className="font-medium text-[var(--nimmit-accent-primary)]">{client.profile.firstName[0]}{client.profile.lastName[0]}</span>
                    </div>
                    <div>
                        <p className="font-medium text-[var(--nimmit-text-primary)]">{client.profile.firstName} {client.profile.lastName}</p>
                        <p className="text-sm text-[var(--nimmit-text-tertiary)]">{client.email}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
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

// Progress Updates Card
function ProgressCard({ jobId, updates, onUpdateAdded }: { jobId: string; updates: ProgressUpdate[]; onUpdateAdded: (update: ProgressUpdate) => void }) {
    const [content, setContent] = useState("");
    const [percentage, setPercentage] = useState<number>(0);
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim()) return;
        setSubmitting(true);
        try {
            const response = await fetch(`/api/jobs/${jobId}/progress`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: content.trim(), percentage: percentage > 0 ? percentage : undefined }),
            });
            const data = await response.json();
            if (data.success) {
                onUpdateAdded(data.data);
                setContent("");
                setPercentage(0);
                setShowForm(false);
                toast.success("Progress update added");
            } else {
                toast.error(data.error || "Failed to add update");
            }
        } catch {
            toast.error("Failed to add update");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                    <svg className="w-5 h-5 text-[var(--nimmit-accent-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    Progress
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {updates.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {updates.slice().reverse().map((u) => (
                            <div key={u.id} className="text-sm p-2 rounded bg-[var(--nimmit-bg-secondary)] border border-[var(--nimmit-border)]">
                                <div className="flex justify-between text-xs text-[var(--nimmit-text-tertiary)] mb-1">
                                    {u.percentage !== undefined && <span className="font-medium text-[var(--nimmit-accent-primary)]">{u.percentage}%</span>}
                                    <span>{new Date(u.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="text-[var(--nimmit-text-primary)]">{u.content}</p>
                            </div>
                        ))}
                    </div>
                )}

                {showForm ? (
                    <div className="space-y-3 pt-2 border-t border-[var(--nimmit-border)]">
                        <Textarea placeholder="What did you work on?" value={content} onChange={(e) => setContent(e.target.value)} rows={2} className="border-[var(--nimmit-border)]" />
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-[var(--nimmit-text-tertiary)]">
                                <span>Completion</span><span>{percentage}%</span>
                            </div>
                            <Slider value={[percentage]} onValueChange={(v) => setPercentage(v[0])} max={100} step={5} />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
                            <Button size="sm" onClick={handleSubmit} disabled={!content.trim() || submitting} className="flex-1 bg-[var(--nimmit-accent-primary)]">{submitting ? "..." : "Add"}</Button>
                        </div>
                    </div>
                ) : (
                    <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="w-full border-dashed">
                        + Add Progress Update
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

// Confidence Flag Card
function ConfidenceFlagCard({ jobId, flag, onFlagged }: { jobId: string; flag?: ConfidenceFlag; onFlagged: (flag: ConfidenceFlag) => void }) {
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);

    if (flag?.flagged) {
        return (
            <Card className="border-[var(--nimmit-warning)]/30 bg-[var(--nimmit-warning-bg)]/30 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-display text-[var(--nimmit-warning)] flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Flagged for Review
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-[var(--nimmit-warning)]">{flag.reason}</p>
                    <p className="text-xs text-[var(--nimmit-text-tertiary)] mt-2">Admin will review and provide guidance.</p>
                </CardContent>
            </Card>
        );
    }

    const handleFlag = async () => {
        if (!reason.trim()) return;
        setSubmitting(true);
        try {
            const response = await fetch(`/api/jobs/${jobId}/flag`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: reason.trim() }),
            });
            const data = await response.json();
            if (data.success) {
                onFlagged({ flagged: true, reason: reason.trim(), flaggedAt: new Date() });
                setReason("");
                setShowForm(false);
                toast.success("Job flagged for admin review");
            } else {
                toast.error(data.error || "Failed to flag job");
            }
        } catch {
            toast.error("Failed to flag job");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="border-[var(--nimmit-border)] shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                    <svg className="w-5 h-5 text-[var(--nimmit-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Need Help?
                </CardTitle>
                <CardDescription>Flag this job if you need clarification</CardDescription>
            </CardHeader>
            <CardContent>
                {showForm ? (
                    <div className="space-y-3">
                        <Textarea placeholder="Describe what you're unsure about..." value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="border-[var(--nimmit-border)]" />
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
                            <Button size="sm" onClick={handleFlag} disabled={!reason.trim() || submitting} className="flex-1 bg-[var(--nimmit-warning)] text-white">{submitting ? "..." : "Flag"}</Button>
                        </div>
                    </div>
                ) : (
                    <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="w-full text-[var(--nimmit-text-secondary)]">
                        Flag for Clarification
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
