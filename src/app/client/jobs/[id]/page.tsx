"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileList } from "@/components/job/file-list";
import { useJobPolling } from "@/hooks/useJobPolling";
import type { Job, JobMessage } from "@/types";

interface JobWithPopulated extends Omit<Job, "workerId" | "messages"> {
    workerId?: {
        _id: string;
        profile: { firstName: string; lastName: string };
        email: string;
    };
    messages: Array<JobMessage & { senderRole: string }>;
}

const completeJobSchema = z.object({
    rating: z.number().min(1).max(5),
    feedback: z.string().max(2000).optional(),
});

type CompleteJobInput = z.infer<typeof completeJobSchema>;

export default function ClientJobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [message, setMessage] = useState("");
    const [completing, setCompleting] = useState(false);
    const [showRating, setShowRating] = useState(false);
    const [previousStatus, setPreviousStatus] = useState<string | null>(null);

    const {
        job,
        isLoading: loading,
        error,
        refetch,
    } = useJobPolling({
        jobId: params.id as string,
        interval: 5000,
        onUpdate: useCallback((updatedJob: { status: string }) => {
            if (previousStatus && previousStatus !== updatedJob.status) {
                const statusMessages: Record<string, string> = {
                    assigned: "Your task has been assigned to an assistant!",
                    in_progress: "Your assistant has started working on your task",
                    review: "Your task is ready for review!",
                    completed: "Task completed!",
                    revision: "Revision in progress",
                };
                const msg = statusMessages[updatedJob.status];
                if (msg) {
                    toast.success(msg);
                }
            }
            setPreviousStatus(updatedJob.status);
        }, [previousStatus]),
    });

    useEffect(() => {
        if (job && !previousStatus) {
            setPreviousStatus(job.status);
        }
    }, [job, previousStatus]);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<CompleteJobInput>({
        resolver: zodResolver(completeJobSchema),
    });

    const selectedRating = watch("rating");
    const typedJob = job as JobWithPopulated | null;

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
                await refetch();
                setMessage("");
                toast.success("Message sent");
            } else {
                toast.error(data.error?.message || "Failed to send message");
            }
        } catch (err) {
            console.error("Failed to send message:", err);
            toast.error("Failed to send message");
        }
    };

    const requestRevision = async () => {
        if (!message.trim()) {
            toast.error("Please provide feedback for the revision");
            return;
        }
        try {
            await fetch(`/api/jobs/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "addMessage", message: `Revision requested: ${message.trim()}` }),
            });
            const response = await fetch(`/api/jobs/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "updateStatus", status: "revision" }),
            });
            const data = await response.json();
            if (data.success) {
                await refetch();
                setMessage("");
                toast.success("Revision requested");
            } else {
                toast.error(data.error?.message || "Failed to request revision");
            }
        } catch (err) {
            console.error("Failed to request revision:", err);
            toast.error("Failed to request revision");
        }
    };

    const onCompleteSubmit = async (data: CompleteJobInput) => {
        setCompleting(true);
        try {
            const response = await fetch(`/api/jobs/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "complete", rating: data.rating, feedback: data.feedback }),
            });
            const result = await response.json();
            if (result.success) {
                await refetch();
                setShowRating(false);
                toast.success("Job completed! Thank you for your feedback.");
            } else {
                toast.error(result.error?.message || "Failed to complete job");
            }
        } catch (err) {
            console.error("Failed to complete job:", err);
            toast.error("Failed to complete job");
        } finally {
            setCompleting(false);
        }
    };

    const cancelJob = async () => {
        if (!confirm("Are you sure you want to cancel this job?")) return;
        try {
            const response = await fetch(`/api/jobs/${params.id}`, { method: "DELETE" });
            const data = await response.json();
            if (data.success) {
                toast.success("Job cancelled");
                router.push("/client/jobs");
            } else {
                toast.error(data.error?.message || "Failed to cancel job");
            }
        } catch (err) {
            console.error("Failed to cancel job:", err);
            toast.error("Failed to cancel job");
        }
    };

    if (loading) {
        return <LoadingSkeleton />;
    }

    if (error || !typedJob) {
        return (
            <div className="min-h-screen bg-[var(--nimmit-bg-primary)] flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-[var(--nimmit-border)]">
                    <CardContent className="pt-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--nimmit-error-bg)] flex items-center justify-center">
                            <svg className="w-8 h-8 text-[var(--nimmit-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-[var(--nimmit-text-primary)] mb-2">{error || "Job not found"}</h3>
                        <Button variant="outline" className="mt-4" onClick={() => router.back()}>Go Back</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--nimmit-bg-primary)]">
            <div className="max-w-6xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8 animate-fade-up">
                    <div>
                        <button
                            onClick={() => router.back()}
                            className="inline-flex items-center gap-1 text-sm text-[var(--nimmit-text-secondary)] hover:text-[var(--nimmit-accent-primary)] transition-colors mb-3"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Tasks
                        </button>
                        <h1 className="text-2xl md:text-3xl font-display font-semibold tracking-tight text-[var(--nimmit-text-primary)]">
                            {typedJob.title}
                        </h1>
                        {typedJob.workerId && (
                            <p className="text-[var(--nimmit-text-secondary)] mt-1 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Assigned to {typedJob.workerId.profile.firstName} {typedJob.workerId.profile.lastName}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {typedJob.priority !== "standard" && <PriorityBadge priority={typedJob.priority} />}
                        <StatusBadge status={typedJob.status} />
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description Card */}
                        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-1">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg font-display">Description</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap text-[var(--nimmit-text-primary)] leading-relaxed">{typedJob.description}</p>
                            </CardContent>
                        </Card>

                        {/* Review Actions */}
                        {typedJob.status === "review" && !showRating && (
                            <ReviewCard
                                message={message}
                                setMessage={setMessage}
                                onApprove={() => setShowRating(true)}
                                onRevision={requestRevision}
                            />
                        )}

                        {/* Rating Form */}
                        {showRating && (
                            <RatingCard
                                selectedRating={selectedRating}
                                onSetRating={(star) => setValue("rating", star)}
                                onSubmit={handleSubmit(onCompleteSubmit)}
                                onCancel={() => setShowRating(false)}
                                completing={completing}
                                register={register}
                                errors={errors}
                            />
                        )}

                        {/* Completed Card */}
                        {typedJob.status === "completed" && (
                            <CompletedCard job={typedJob} />
                        )}

                        {/* Files */}
                        {(typedJob.files.length > 0 || typedJob.deliverables.length > 0) && (
                            <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-2">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg font-display">Files</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {typedJob.files.length > 0 && (
                                        <FileList files={typedJob.files} title="Reference Files" emptyMessage="No reference files" />
                                    )}
                                    {typedJob.deliverables.length > 0 && (
                                        <FileList files={typedJob.deliverables} title="Deliverables" emptyMessage="No deliverables yet" />
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Messages */}
                        <MessagesCard
                            messages={typedJob.messages}
                            status={typedJob.status}
                            message={message}
                            setMessage={setMessage}
                            onSend={sendMessage}
                        />
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <DetailsCard job={typedJob} />
                        {typedJob.workerId && <AssistantCard worker={typedJob.workerId} />}
                        {(typedJob.status === "pending" || typedJob.status === "assigned") && (
                            <ActionsCard onCancel={cancelJob} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Loading Skeleton
function LoadingSkeleton() {
    return (
        <div className="min-h-screen bg-[var(--nimmit-bg-primary)]">
            <div className="max-w-6xl mx-auto px-6 py-10">
                <div className="space-y-4 mb-8">
                    <div className="h-4 w-24 skeleton rounded" />
                    <div className="h-8 w-96 skeleton rounded" />
                    <div className="h-4 w-48 skeleton rounded" />
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="h-48 skeleton rounded-xl" />
                        <div className="h-64 skeleton rounded-xl" />
                    </div>
                    <div className="space-y-6">
                        <div className="h-48 skeleton rounded-xl" />
                        <div className="h-32 skeleton rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Review Card
function ReviewCard({ message, setMessage, onApprove, onRevision }: {
    message: string;
    setMessage: (m: string) => void;
    onApprove: () => void;
    onRevision: () => void;
}) {
    return (
        <Card className="border-[var(--nimmit-success)]/30 bg-[var(--nimmit-success-bg)]/30 shadow-sm animate-fade-up">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--nimmit-success)]/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-[var(--nimmit-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div>
                        <CardTitle className="text-lg font-display text-[var(--nimmit-success)]">Ready for Review!</CardTitle>
                        <CardDescription>Your assistant has submitted this task</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-3">
                    <Button onClick={onApprove} className="flex-1 bg-[var(--nimmit-success)] hover:bg-[var(--nimmit-success)]/90">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve & Complete
                    </Button>
                    <Button variant="outline" onClick={onRevision} disabled={!message.trim()} className="flex-1 border-[var(--nimmit-border)]">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Request Revision
                    </Button>
                </div>
                <Textarea
                    placeholder="Add feedback or revision notes..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    className="bg-white border-[var(--nimmit-border)]"
                />
            </CardContent>
        </Card>
    );
}

// Rating Card
function RatingCard({ selectedRating, onSetRating, onSubmit, onCancel, completing, register, errors }: {
    selectedRating: number;
    onSetRating: (star: number) => void;
    onSubmit: () => void;
    onCancel: () => void;
    completing: boolean;
    register: ReturnType<typeof useForm<CompleteJobInput>>["register"];
    errors: ReturnType<typeof useForm<CompleteJobInput>>["formState"]["errors"];
}) {
    return (
        <Card className="border-[var(--nimmit-success)]/30 bg-[var(--nimmit-success-bg)]/30 shadow-sm animate-scale-in">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-display">Rate this Task</CardTitle>
                <CardDescription>How would you rate the delivery?</CardDescription>
            </CardHeader>
            <form onSubmit={onSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Rating</Label>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => onSetRating(star)}
                                    className={`text-3xl transition-transform hover:scale-110 ${selectedRating >= star ? "text-yellow-400" : "text-gray-300"}`}
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                        {errors.rating && <p className="text-sm text-[var(--nimmit-error)]">Please select a rating</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="feedback">Feedback <span className="text-[var(--nimmit-text-tertiary)]">(optional)</span></Label>
                        <Textarea id="feedback" placeholder="Any additional feedback..." {...register("feedback")} rows={3} className="bg-white border-[var(--nimmit-border)]" />
                    </div>
                    <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={onCancel} className="border-[var(--nimmit-border)]">Cancel</Button>
                        <Button type="submit" disabled={completing} className="flex-1 bg-[var(--nimmit-success)] hover:bg-[var(--nimmit-success)]/90">
                            {completing ? "Submitting..." : "Complete Task"}
                        </Button>
                    </div>
                </CardContent>
            </form>
        </Card>
    );
}

// Completed Card
function CompletedCard({ job }: { job: JobWithPopulated }) {
    return (
        <Card className="border-[var(--nimmit-success)]/30 bg-[var(--nimmit-success-bg)]/50 shadow-sm animate-fade-up">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--nimmit-success)]/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-[var(--nimmit-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <CardTitle className="text-lg font-display text-[var(--nimmit-success)]">Task Completed!</CardTitle>
                        <CardDescription>Completed on {new Date(job.completedAt!).toLocaleDateString()}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            {job.rating && (
                <CardContent>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--nimmit-text-secondary)]">Your rating:</span>
                        <span className="text-yellow-400 text-xl">{"★".repeat(job.rating)}{"☆".repeat(5 - job.rating)}</span>
                    </div>
                    {job.feedback && <p className="mt-2 text-sm text-[var(--nimmit-text-secondary)] italic">&ldquo;{job.feedback}&rdquo;</p>}
                </CardContent>
            )}
        </Card>
    );
}

// Messages Card
function MessagesCard({ messages, status, message, setMessage, onSend }: {
    messages: JobWithPopulated["messages"];
    status: string;
    message: string;
    setMessage: (m: string) => void;
    onSend: () => void;
}) {
    const canMessage = !["completed", "cancelled", "pending"].includes(status);

    return (
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-3">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-display">Messages</CardTitle>
                <CardDescription>Communication with your assistant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--nimmit-bg-secondary)] flex items-center justify-center">
                            <svg className="w-6 h-6 text-[var(--nimmit-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p className="text-[var(--nimmit-text-secondary)]">No messages yet</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`p-3 rounded-xl ${msg.senderRole === "client" ? "bg-[var(--nimmit-accent-primary)]/10 ml-8" : "bg-[var(--nimmit-bg-secondary)] mr-8"}`}>
                                <div className="flex justify-between text-xs text-[var(--nimmit-text-tertiary)] mb-1">
                                    <span className="font-medium">{msg.senderRole === "client" ? "You" : "Assistant"}</span>
                                    <span>{new Date(msg.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-[var(--nimmit-text-primary)]">{msg.message}</p>
                            </div>
                        ))}
                    </div>
                )}
                {canMessage && (
                    <div className="flex gap-2 pt-4 border-t border-[var(--nimmit-border)]">
                        <Textarea placeholder="Type a message..." value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)]" />
                        <Button onClick={onSend} disabled={!message.trim()} className="bg-[var(--nimmit-accent-primary)] hover:bg-[var(--nimmit-accent-primary-hover)]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Details Card
function DetailsCard({ job }: { job: JobWithPopulated }) {
    const details = [
        { label: "Category", value: job.category, icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" },
        { label: "Created", value: new Date(job.createdAt).toLocaleDateString(), icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
        job.assignedAt && { label: "Assigned", value: new Date(job.assignedAt).toLocaleDateString(), icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
        job.startedAt && { label: "Started", value: new Date(job.startedAt).toLocaleDateString(), icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" },
        job.completedAt && { label: "Completed", value: new Date(job.completedAt).toLocaleDateString(), icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
        job.estimatedHours && { label: "Est. Hours", value: `${job.estimatedHours} hours`, icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    ].filter(Boolean) as { label: string; value: string; icon: string }[];

    return (
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-4">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-display">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {details.map((detail) => (
                    <div key={detail.label} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--nimmit-bg-secondary)] flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-[var(--nimmit-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={detail.icon} />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-[var(--nimmit-text-tertiary)]">{detail.label}</p>
                            <p className="font-medium text-[var(--nimmit-text-primary)] capitalize">{detail.value}</p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

// Assistant Card
function AssistantCard({ worker }: { worker: NonNullable<JobWithPopulated["workerId"]> }) {
    return (
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-5">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-display">Your Assistant</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--nimmit-accent-primary)]/10 flex items-center justify-center">
                        <span className="font-medium text-[var(--nimmit-accent-primary)]">
                            {worker.profile.firstName[0]}{worker.profile.lastName[0]}
                        </span>
                    </div>
                    <p className="font-medium text-[var(--nimmit-text-primary)]">{worker.profile.firstName} {worker.profile.lastName}</p>
                </div>
            </CardContent>
        </Card>
    );
}

// Actions Card
function ActionsCard({ onCancel }: { onCancel: () => void }) {
    return (
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-6">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-display">Actions</CardTitle>
            </CardHeader>
            <CardContent>
                <Button variant="outline" className="w-full border-[var(--nimmit-error)]/30 text-[var(--nimmit-error)] hover:bg-[var(--nimmit-error-bg)]" onClick={onCancel}>
                    Cancel Task
                </Button>
            </CardContent>
        </Card>
    );
}

// Priority Badge
function PriorityBadge({ priority }: { priority: string }) {
    const config: Record<string, { className: string; label: string }> = {
        rush: { className: "bg-[var(--nimmit-error)]/10 text-[var(--nimmit-error)] border-[var(--nimmit-error)]/20", label: "Rush" },
        express: { className: "bg-[var(--nimmit-warning-bg)] text-[var(--nimmit-warning)] border-[var(--nimmit-warning)]/20", label: "Express" },
    };
    const { className, label } = config[priority] || { className: "", label: priority };
    return <Badge variant="outline" className={`px-2.5 py-0.5 text-xs font-medium border rounded-full ${className}`}>{label}</Badge>;
}

// Status Badge
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { className: string; label: string }> = {
        pending: { className: "bg-[var(--nimmit-warning-bg)] text-[var(--nimmit-warning)] border-[var(--nimmit-warning)]/20", label: "Pending" },
        assigned: { className: "bg-[var(--nimmit-info-bg)] text-[var(--nimmit-info)] border-[var(--nimmit-info)]/20", label: "Assigned" },
        in_progress: { className: "bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)] border-[var(--nimmit-accent-primary)]/20", label: "In Progress" },
        review: { className: "bg-[var(--nimmit-info-bg)] text-[var(--nimmit-info)] border-[var(--nimmit-info)]/20", label: "Ready for Review" },
        revision: { className: "bg-[var(--nimmit-warning-bg)] text-[var(--nimmit-warning)] border-[var(--nimmit-warning)]/20", label: "Revision" },
        completed: { className: "bg-[var(--nimmit-success-bg)] text-[var(--nimmit-success)] border-[var(--nimmit-success)]/20", label: "Completed" },
        cancelled: { className: "bg-[var(--nimmit-error-bg)] text-[var(--nimmit-error)] border-[var(--nimmit-error)]/20", label: "Cancelled" },
    };
    const { className, label } = config[status] || config.pending;
    return <Badge variant="outline" className={`px-2.5 py-0.5 text-xs font-medium border rounded-full ${className}`}>{label}</Badge>;
}
