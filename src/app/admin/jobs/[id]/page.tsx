"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Job, JobMessage } from "@/types";
import type { IUser } from "@/lib/db/models";
import { Calendar, Clock, ArrowLeft, Send, CheckCircle, AlertCircle, MoreHorizontal } from "lucide-react";

interface JobWithPopulated extends Omit<Job, "clientId" | "workerId" | "messages"> {
    clientId: { _id: string; profile: { firstName: string; lastName: string }; email: string };
    workerId?: { _id: string; profile: { firstName: string; lastName: string }; email: string };
    messages: Array<JobMessage & { senderRole: string }>;
}

export default function AdminJobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [job, setJob] = useState<JobWithPopulated | null>(null);
    const [workers, setWorkers] = useState<IUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
    const [estimatedHours, setEstimatedHours] = useState<string>("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            // ... fetching logic same as before ...
            try {
                const [jobRes, workersRes] = await Promise.all([fetch(`/api/jobs/${params.id}`), fetch("/api/users?role=worker")]);
                const [jobData, workersData] = await Promise.all([jobRes.json(), workersRes.json()]);
                if (jobData.success) setJob(jobData.data);
                else setError(jobData.error?.message || "Failed to load job");
                if (workersData.success) setWorkers(workersData.data);
            } catch {
                setError("Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        if (params.id) fetchData();
    }, [params.id]);

    // ... helper functions (assignJob, sendMessage, cancelJob) ...
    const assignJob = async () => {
        if (!selectedWorkerId) { toast.error("Please select a worker"); return; }
        setAssigning(true);
        try {
            const response = await fetch(`/api/jobs/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "assign", workerId: selectedWorkerId, estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined }),
            });
            const data = await response.json();
            if (data.success) {
                toast.success("Job assigned");
                const refreshRes = await fetch(`/api/jobs/${params.id}`);
                const refreshData = await refreshRes.json();
                if (refreshData.success) setJob(refreshData.data);
            } else {
                toast.error(data.error?.message || "Failed to assign");
            }
        } catch {
            toast.error("Failed to assign");
        } finally {
            setAssigning(false);
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
                toast.error(data.error?.message || "Failed to send");
            }
        } catch {
            toast.error("Failed to send");
        }
    };

    const cancelJob = async () => {
        if (!confirm("Are you sure?")) return;
        try {
            const response = await fetch(`/api/jobs/${params.id}`, { method: "DELETE" });
            const data = await response.json();
            if (data.success) {
                toast.success("Job cancelled");
                router.push("/admin/jobs");
            } else {
                toast.error("Failed to cancel");
            }
        } catch {
            toast.error("Failed to cancel");
        }
    };


    if (loading) return <div className="p-8 text-sm text-[var(--nimmit-text-tertiary)]">Loading job details...</div>;
    if (error || !job) return <div className="p-8 text-sm text-[var(--nimmit-error)]">Error: {error || "Job not found"}</div>;

    const availableWorkers = workers.filter((w) => w.workerProfile?.availability !== "offline");
    const isPending = job.status === "pending";

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
            {/* Compact Header */}
            <div className="flex items-center justify-between gap-4 border-b border-[var(--nimmit-border)] p-3 bg-white shrink-0">
                <div className="flex items-center gap-3 overflow-hidden">
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.push('/admin/jobs')}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-[var(--nimmit-text-tertiary)] w-14 shrink-0">#{job._id.toString().slice(-6)}</span>
                            <h1 className="text-sm font-bold text-[var(--nimmit-text-primary)] truncate max-w-[300px]">{job.title}</h1>
                            <StatusBadge status={job.status} />
                            {job.priority !== 'standard' && <Badge variant="outline" className="h-4 text-[10px] px-1 border-red-200 text-red-700 bg-red-50">{job.priority}</Badge>}
                        </div>
                        <div className="text-[10px] text-[var(--nimmit-text-secondary)] flex items-center gap-2 mt-0.5">
                            <span>Client: <span className="font-medium text-[var(--nimmit-text-primary)]">{job.clientId?.profile?.firstName || 'Unknown'} {job.clientId?.profile?.lastName || ''}</span></span>
                            <span>•</span>
                            <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => router.push(`/admin/jobs/${job._id}/edit`)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={cancelJob}><MoreHorizontal className="w-4 h-4" /></Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <div className="grid lg:grid-cols-12 h-full">
                    {/* Main Content (Chat & Description) - 8 cols */}
                    <div className="lg:col-span-8 flex flex-col h-full border-r border-[var(--nimmit-border)] overflow-hidden">
                        {/* Scrollable Content Area */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {/* Assign Box (if pending) */}
                            {isPending && (
                                <div className="bg-yellow-50/50 border border-yellow-100 rounded p-2 flex items-center gap-2 text-xs">
                                    <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0" />
                                    <span className="font-medium text-yellow-800">Assign:</span>
                                    <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                                        <SelectTrigger className="h-7 w-[180px] text-xs bg-white border-yellow-200">
                                            <SelectValue placeholder="Worker..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableWorkers.map(w => (
                                                <SelectItem key={w._id.toString()} value={w._id.toString()} className="text-xs">
                                                    {w.profile.firstName} {w.profile.lastName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        placeholder="Hrs"
                                        type="number"
                                        className="h-7 w-16 text-xs bg-white border-yellow-200"
                                        value={estimatedHours}
                                        onChange={e => setEstimatedHours(e.target.value)}
                                    />
                                    <Button size="sm" onClick={assignJob} disabled={!selectedWorkerId || assigning} className="h-7 text-xs bg-yellow-600 hover:bg-yellow-700 text-white ml-auto">
                                        Confirm
                                    </Button>
                                </div>
                            )}

                            <Card className="border-[var(--nimmit-border)] shadow-none rounded-md">
                                <CardHeader className="py-2 px-3 border-b border-[var(--nimmit-border)] bg-[var(--nimmit-bg-secondary)]/30">
                                    <CardTitle className="text-xs font-semibold text-[var(--nimmit-text-secondary)] uppercase tracking-wider">Specs</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 text-sm text-[var(--nimmit-text-primary)] leading-relaxed whitespace-pre-wrap font-serif">
                                    {job.description}
                                </CardContent>
                            </Card>

                            {/* Compact Discussion Feed */}
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center gap-2 px-1">
                                    <div className="h-px bg-gray-200 flex-1"></div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Activity & Messages</span>
                                    <div className="h-px bg-gray-200 flex-1"></div>
                                </div>

                                {job.messages.length === 0 ? (
                                    <div className="text-center py-8 text-xs text-gray-400 italic">No activity recorded.</div>
                                ) : (
                                    job.messages.map((msg, i) => (
                                        <div key={i} className={`flex gap-3 group ${msg.senderRole === 'admin' ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 
                                                ${msg.senderRole === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {msg.senderRole[0].toUpperCase()}
                                            </div>
                                            <div className={`max-w-[85%]`}>
                                                <div className={`flex items-baseline gap-2 mb-1 ${msg.senderRole === 'admin' ? 'flex-row-reverse' : ''}`}>
                                                    <span className="text-xs font-medium text-gray-900 capitalize">{msg.senderRole}</span>
                                                    <span className="text-[10px] text-gray-400">{new Date(msg.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <div className={`p-2 rounded text-sm leading-snug whitespace-pre-wrap
                                                    ${msg.senderRole === 'admin' ? 'bg-purple-50 text-purple-900 border border-purple-100' : 'bg-white border border-gray-200 text-gray-800'}`}>
                                                    {msg.message}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Sticky Input Area */}
                        <div className="p-3 border-t border-[var(--nimmit-border)] bg-gray-50 flex gap-2 shrink-0">
                            <Textarea
                                className="min-h-[38px] h-[38px] max-h-[120px] py-2 text-sm bg-white resize-none"
                                placeholder="Message..."
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                            />
                            <Button size="sm" className="h-[38px] w-[38px] p-0 bg-[var(--nimmit-accent-primary)] hover:bg-[var(--nimmit-accent-primary)]/90" onClick={sendMessage}>
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Sidebar (Details & Files) - 4 cols */}
                    <div className="lg:col-span-4 h-full overflow-y-auto bg-[var(--nimmit-bg-secondary)]/10 p-3 space-y-3">
                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white p-2 rounded border border-[var(--nimmit-border)]">
                                <p className="text-[10px] text-[var(--nimmit-text-tertiary)] uppercase">Worker</p>
                                <p className="text-xs font-medium truncate">
                                    {job.workerId?.profile ? `${job.workerId.profile.firstName} ${job.workerId.profile.lastName}` : "Unassigned"}
                                </p>
                            </div>
                            <div className="bg-white p-2 rounded border border-[var(--nimmit-border)]">
                                <p className="text-[10px] text-[var(--nimmit-text-tertiary)] uppercase">Category</p>
                                <p className="text-xs font-medium capitalize truncate">{job.category}</p>
                            </div>
                            <div className="bg-white p-2 rounded border border-[var(--nimmit-border)]">
                                <p className="text-[10px] text-[var(--nimmit-text-tertiary)] uppercase">Est. Hours</p>
                                <p className="text-xs font-medium">{job.estimatedHours || '-'}h</p>
                            </div>
                            <div className="bg-white p-2 rounded border border-[var(--nimmit-border)]">
                                <p className="text-[10px] text-[var(--nimmit-text-tertiary)] uppercase">Created</p>
                                <p className="text-xs font-medium">{new Date(job.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* Files */}
                        <Card className="border-[var(--nimmit-border)] shadow-none rounded-md">
                            <CardHeader className="py-2 px-3 border-b border-[var(--nimmit-border)] bg-white">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-xs font-semibold text-[var(--nimmit-text-secondary)] uppercase tracking-wider">Files</CardTitle>
                                    <span className="text-[10px] bg-gray-100 px-1.5 rounded text-gray-500">{job.files.length}</span>
                                </div>
                            </CardHeader>
                            <div className="p-0">
                                {job.files.length > 0 ? job.files.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 p-2 px-3 border-b last:border-0 border-[var(--nimmit-border)] hover:bg-gray-50 transition-colors text-xs">
                                        <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[8px] uppercase shrink-0">
                                            {f.name.split('.').pop()?.slice(0, 3)}
                                        </div>
                                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:underline text-blue-600 font-medium">
                                            {f.name.length > 25 ? f.name.slice(0, 25) + '...' : f.name}
                                        </a>
                                        <span className="text-[10px] text-gray-400 shrink-0">{(f.size / 1024).toFixed(0)}kb</span>
                                    </div>
                                )) : <div className="text-xs text-gray-400 p-3 italic">No attachments.</div>}
                            </div>
                        </Card>

                        {/* Admin Meta */}
                        <div className="p-3 rounded border border-dashed border-[var(--nimmit-border)] text-[10px] text-gray-400 font-mono space-y-1">
                            <div className="flex justify-between">
                                <span>ID:</span>
                                <span className="select-all">{job._id.toString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Updated:</span>
                                <span>{new Date(job.updatedAt).toLocaleString()}</span>
                            </div>
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
        completed: "bg-green-100 text-green-800 border-green-200",
        cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return (
        <Badge variant="outline" className={`border ${styles[status] || styles.pending} uppercase text-[10px] h-5 px-1.5`}>
            {status.replace('_', ' ')}
        </Badge>
    );
}
