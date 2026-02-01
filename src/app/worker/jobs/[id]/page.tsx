"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Send, UploadCloud, FileText, CheckCircle, Clock } from "lucide-react";
import { FileUpload } from "@/components/job/file-upload";

// ... Interfaces
interface Job {
    _id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    files: any[];
    messages: any[];
    clientId: { profile: { firstName: string; lastName: string } };
    createdAt: string;
}

export default function WorkerJobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [job, setJob] = useState<Job | null>(null);
    const [message, setMessage] = useState("");
    const [uploading, setUploading] = useState(false);
    const messagesRef = useRef<HTMLDivElement>(null);

    const fetchJob = async () => {
        const res = await fetch(`/api/jobs/${params.id}`);
        const json = await res.json();
        if (json.success) setJob(json.data);
    };

    useEffect(() => { fetchJob(); }, []);

    const sendMessage = async () => {
        if (!message.trim()) return;
        await fetch(`/api/jobs/${params.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "addMessage", message: message.trim() }),
        });
        setMessage("");
        fetchJob();
    };

    const updateStatus = async (status: string) => {
        await fetch(`/api/jobs/${params.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "updateStatus", status }),
        });
        toast.success(`Status updated to ${status}`);
        fetchJob();
    };

    const handleUpload = async (files: any[]) => {
        // Mock upload handling - usually via FileUpload component
        toast.success("Files uploaded");
        // Trigger status update if needed
    };

    if (!job) return <div className="p-8 text-sm text-gray-500">Loading...</div>;

    const nextAction = {
        assigned: { label: "Start Work", status: "in_progress", color: "bg-blue-600 hover:bg-blue-700" },
        in_progress: { label: "Submit for Review", status: "review", color: "bg-green-600 hover:bg-green-700" },
        revision: { label: "Resubmit", status: "review", color: "bg-orange-600 hover:bg-orange-700" },
    }[job.status];

    return (

        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-white">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-[var(--nimmit-border)] px-4 py-3 bg-white shrink-0">
                <div className="flex items-center gap-3 overflow-hidden">
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.push('/worker/jobs')}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-[var(--nimmit-text-tertiary)] shrink-0">#{job._id.slice(-6)}</span>
                            <h1 className="text-sm font-bold text-[var(--nimmit-text-primary)] truncate max-w-[400px]">{job.title}</h1>
                            <Badge variant="outline" className="h-4 text-[10px] px-1 uppercase">{job.status.replace("_", " ")}</Badge>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {nextAction && (
                        <Button
                            size="sm"
                            className={`h-7 text-xs px-3 shadow-sm ${nextAction.color} text-white`}
                            onClick={() => updateStatus(nextAction.status)}
                        >
                            {nextAction.label}
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Layout: Flex Row */}
            <div className="flex flex-1 overflow-hidden">

                {/* 1. Main Chat Area - Centered & Focused */}
                <div className="flex-1 flex flex-col items-center overflow-hidden">
                    <div className="w-full flex flex-col h-full bg-white">

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Task Brief Summary */}
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 mb-6 text-sm">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <FileText className="w-3 h-3" /> Task Brief
                                </h3>
                                <p className="text-gray-700 leading-relaxed font-serif">{job.description}</p>
                            </div>

                            <div className="flex items-center gap-2 px-4 py-2 opacity-60">
                                <div className="h-px bg-gray-200 flex-1"></div>
                                <span className="text-[10px] uppercase font-bold text-gray-400">Discussion</span>
                                <div className="h-px bg-gray-200 flex-1"></div>
                            </div>

                            {job.messages.length === 0 ? (
                                <div className="text-center py-10 text-xs text-gray-400 italic">No messages yet.</div>
                            ) : (
                                job.messages.map((msg, i) => (
                                    <div key={i} className={`flex gap-3 group px-2 ${msg.senderRole === "worker" ? "flex-row-reverse" : ""}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm
                                            ${msg.senderRole === 'worker' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                                            {msg.senderRole[0].toUpperCase()}
                                        </div>
                                        <div className={`max-w-[75%] flex flex-col ${msg.senderRole === 'worker' ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-baseline gap-2 mb-1 px-1">
                                                <span className="text-[11px] font-medium text-gray-900 capitalize">{msg.senderRole}</span>
                                                <span className="text-[10px] text-gray-400">{new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className={`py-2 px-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${msg.senderRole === 'worker'
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                                                }`}>
                                                {msg.message}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesRef} />
                        </div>

                        {/* Input Area */}
                        {/* Floating Input Area - Google AI Studio Style */}
                        <div className="w-full max-w-3xl mx-auto p-4 pb-6">
                            <div className="relative flex items-end gap-2 bg-[#f0f4f9] border-none rounded-[28px] p-2 pl-4 transition-all shadow-sm hover:shadow-md">
                                <Textarea
                                    className="min-h-[44px] max-h-[140px] w-full border-0 focus-visible:ring-0 p-2 text-sm resize-none bg-transparent placeholder:text-gray-500"
                                    placeholder="Type a message..."
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                                />
                                <div className="flex pb-1 pr-1">
                                    <Button size="icon" className="h-8 w-8 rounded-full shrink-0 bg-blue-600 hover:bg-blue-700 text-white shadow-none" onClick={sendMessage}>
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

                    {/* Active Work Section (Deliverables) */}
                    {['in_progress', 'revision'].includes(job.status) && (
                        <div className="p-4 border-b border-blue-100 bg-blue-50/30">
                            <h2 className="text-xs font-semibold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <UploadCloud className="w-3 h-3" /> Active Tasks
                            </h2>
                            <p className="text-[10px] text-blue-600 mb-3">Upload your work here for client review.</p>
                            <div className="bg-white rounded-lg border border-blue-100 p-2 shadow-sm">
                                <FileUpload jobId={job._id} onFilesUploaded={handleUpload} maxFiles={5} />
                            </div>
                        </div>
                    )}

                    {/* Metadata Section */}
                    <div className="p-4 border-b border-[var(--nimmit-border)]">
                        <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">Details</h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-medium mb-1">Client</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                        {job.clientId?.profile?.firstName?.[0] || "?"}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                        {job.clientId?.profile?.firstName || 'Unknown'} {job.clientId?.profile?.lastName || ''}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-medium mb-1">Timeline</p>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                    <span>Created {new Date(job.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Files Section */}
                    <div className="flex-1 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Project Files</h2>
                            <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full font-medium">{job.files.length}</span>
                        </div>

                        <div className="space-y-2">
                            {job.files.length > 0 ? job.files.map((f, i) => (
                                <div key={i} className="group flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer">
                                    <div className="bg-white p-1.5 rounded border border-gray-200 shrink-0 text-gray-500 group-hover:text-blue-600">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-700 truncate group-hover:text-gray-900">{f.name}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{(f.size / 1024).toFixed(0)} KB</p>
                                    </div>
                                </div>
                            )) : <div className="p-6 border border-dashed border-gray-200 rounded-lg text-center bg-gray-50/30">
                                <p className="text-xs text-gray-400">No files uploaded.</p>
                            </div>
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
}
