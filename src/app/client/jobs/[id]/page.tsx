"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Clock, Paperclip, Send, Star, AlertCircle, CheckCircle } from "lucide-react";
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

export default function ClientJobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [message, setMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [rating, setRating] = useState(0);
    const { job, isLoading, error, refetch } = useJobPolling({
        jobId: params.id as string,
        interval: 5000,
        onUpdate: (updatedJob) => {
            if (updatedJob.status === 'completed') toast.success("Job completed!");
        }
    });

    const typedJob = job as JobWithPopulated | null;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [typedJob?.messages]);

    const sendMessage = async () => {
        if (!message.trim()) return;
        try {
            await fetch(`/api/jobs/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "addMessage", message: message.trim() }),
            });
            refetch();
            setMessage("");
        } catch {
            toast.error("Failed to send message");
        }
    };

    const completeJob = async () => {
        if (rating === 0) return toast.error("Please rate the job first");
        try {
            await fetch(`/api/jobs/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "complete", rating }),
            });
            refetch();
            toast.success("Job marked as complete");
        } catch {
            toast.error("Failed to complete");
        }
    };

    if (isLoading) return <div className="p-8 text-sm text-[var(--nimmit-text-tertiary)]">Loading task...</div>;
    if (error || !typedJob) return <div className="p-8 text-sm text-[var(--nimmit-error)]">Job not found</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-white">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-[var(--nimmit-border)] px-4 py-3 bg-white shrink-0">
                <div className="flex items-center gap-3 overflow-hidden">
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.push('/client/jobs')}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-[var(--nimmit-text-tertiary)] shrink-0">#{typedJob._id.toString().slice(-6)}</span>
                            <h1 className="text-sm font-bold text-[var(--nimmit-text-primary)] truncate max-w-[400px]">{typedJob.title}</h1>
                            <StatusBadge status={typedJob.status} />
                        </div>
                    </div>
                </div>
                {/* Review Controls (Header Level if applicable, or keep in sidebar) */}
                {typedJob.status === 'review' && (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(s => (
                                <Star
                                    key={s}
                                    className={`w-4 h-4 cursor-pointer ${rating >= s ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                    onClick={() => setRating(s)}
                                />
                            ))}
                        </div>
                        <Button size="sm" onClick={completeJob} disabled={rating === 0} className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white ml-2">
                            Approve & Complete
                        </Button>
                    </div>
                )}
            </div>

            {/* Main Layout: Flex Row */}
            <div className="flex flex-1 overflow-hidden">

                {/* 1. Main Chat Area - Centered & Focused */}
                <div className="flex-1 flex flex-col items-center overflow-hidden">
                    <div className="w-full flex flex-col h-full bg-white">

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Specifications Summary (Pinned at top of chat) */}
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 mb-6 text-sm">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-3 h-3" /> Brief
                                </h3>
                                <p className="text-gray-700 leading-relaxed font-serif">{typedJob.description}</p>
                            </div>

                            <div className="flex items-center gap-2 px-4 py-2 opacity-60">
                                <div className="h-px bg-gray-200 flex-1"></div>
                                <span className="text-[10px] uppercase font-bold text-gray-400">Activity Log</span>
                                <div className="h-px bg-gray-200 flex-1"></div>
                            </div>

                            {typedJob.messages.length === 0 ? (
                                <div className="text-center py-10 text-xs text-gray-400 italic">No messages yet. Start the conversation below.</div>
                            ) : (
                                typedJob.messages.map((msg, i) => (
                                    <div key={i} className={`flex gap-3 group px-2 ${msg.senderRole === "client" ? "flex-row-reverse" : ""}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm
                                            ${msg.senderRole === 'client' ? 'bg-[var(--nimmit-accent-primary)] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                                            {msg.senderRole[0].toUpperCase()}
                                        </div>
                                        <div className={`max-w-[75%] flex flex-col ${msg.senderRole === 'client' ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-baseline gap-2 mb-1 px-1">
                                                <span className="text-[11px] font-medium text-gray-900">{msg.senderRole === 'client' ? 'You' : 'Assistant'}</span>
                                                <span className="text-[10px] text-gray-400">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className={`py-2 px-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${msg.senderRole === 'client'
                                                ? 'bg-[var(--nimmit-accent-primary)] text-white rounded-tr-none'
                                                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                                                }`}>
                                                {msg.message}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        {/* Floating Input Area - Google AI Studio Style */}
                        <div className="w-full max-w-3xl mx-auto p-4 pb-6">
                            <div className="relative flex items-end gap-2 bg-[#f0f4f9] border-none rounded-[28px] p-2 pl-4 transition-all shadow-sm hover:shadow-md">
                                <Textarea
                                    className="min-h-[44px] max-h-[140px] w-full border-0 focus-visible:ring-0 p-2 text-sm resize-none bg-transparent placeholder:text-gray-500"
                                    placeholder="Type a message or updates..."
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                />
                                <div className="flex pb-1 pr-1">
                                    <Button size="icon" className="h-8 w-8 rounded-full shrink-0 bg-[var(--nimmit-accent-primary)] hover:bg-[var(--nimmit-accent-primary)]/90 text-white shadow-none" onClick={sendMessage}>
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-2 px-4 flex justify-between">
                                <span>Enter to send, Shift + Enter for new line</span>
                                <span>Markdown supported</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Fixed Context Sidebar (Right) */}
                <div className="w-[350px] bg-white border-l border-[var(--nimmit-border)] flex flex-col shrink-0 overflow-y-auto z-10">

                    {/* Metadata Section */}
                    <div className="p-4 border-b border-[var(--nimmit-border)]">
                        <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">Job Details</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-medium mb-1">Status</p>
                                    <StatusBadge status={typedJob.status} />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-medium mb-1">Priority</p>
                                    <Badge variant="outline" className={`h-5 text-[10px] ${typedJob.priority !== 'standard' ? 'border-red-200 bg-red-50 text-red-700' : 'text-gray-600'}`}>
                                        {typedJob.priority}
                                    </Badge>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-medium mb-1">Assistant</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 border border-purple-200 flex items-center justify-center text-[10px] font-bold text-purple-700">
                                        {typedJob.workerId?.profile?.firstName?.[0] || "?"}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                        {typedJob.workerId?.profile ? `${typedJob.workerId.profile.firstName} ${typedJob.workerId.profile.lastName}` : "Pending Assignment"}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-medium mb-1">Timeline</p>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                    <span>Created {new Date(typedJob.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Files Section */}
                    <div className="flex-1 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Deliverables</h2>
                            <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full font-medium">{typedJob.files.length}</span>
                        </div>

                        <div className="space-y-2">
                            {typedJob.files.map((f, i) => (
                                <div key={i} className="group flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer">
                                    <div className="bg-white p-1.5 rounded border border-gray-200 shrink-0 text-gray-500 group-hover:text-blue-600">
                                        <Paperclip className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-700 truncate group-hover:text-gray-900">{f.name}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{(f.size / 1024).toFixed(0)} KB</p>
                                    </div>
                                </div>
                            ))}
                            {typedJob.files.length === 0 && (
                                <div className="p-6 border border-dashed border-gray-200 rounded-lg text-center bg-gray-50/30">
                                    <p className="text-xs text-gray-400">No files uploaded yet.</p>
                                </div>
                            )}
                        </div>

                        {/* Support Block */}
                        <div className="mt-8 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                            <p className="text-[10px] text-blue-600 leading-relaxed text-center">
                                Need help? <span className="underline cursor-pointer font-medium hover:text-blue-700">Flag for admin</span>
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
        assigned: "bg-blue-100 text-blue-800 border-blue-200",
        in_progress: "bg-purple-100 text-purple-800 border-purple-200",
        review: "bg-indigo-100 text-indigo-800 border-indigo-200",
        completed: "bg-green-100 text-green-800 border-green-200",
        cancelled: "bg-gray-100 text-gray-800 border-gray-200",
        revision: "bg-orange-100 text-orange-800 border-orange-200",
    };
    return (
        <Badge variant="outline" className={`border ${styles[status] || styles.pending} uppercase text-[10px] h-5 px-1.5`}>
            {status.replace('_', ' ')}
        </Badge>
    );
}
