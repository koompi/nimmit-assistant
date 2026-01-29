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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type SkillLevel = "junior" | "mid" | "senior";

const skillLevelConfig: Record<SkillLevel, { label: string; color: string }> = {
  junior: { label: "Junior", color: "bg-[var(--nimmit-info-bg)] text-[var(--nimmit-info)] border-[var(--nimmit-info)]/20" },
  mid: { label: "Mid", color: "bg-[var(--nimmit-warning-bg)] text-[var(--nimmit-warning)] border-[var(--nimmit-warning)]/20" },
  senior: { label: "Senior", color: "bg-[var(--nimmit-success-bg)] text-[var(--nimmit-success)] border-[var(--nimmit-success)]/20" },
};

interface WorkerData {
  _id: string;
  email: string;
  profile: { firstName: string; lastName: string };
  workerProfile?: {
    skills?: string[];
    skillLevels?: Record<string, SkillLevel>;
    availability?: "available" | "busy" | "offline";
    currentJobCount?: number;
    maxConcurrentJobs?: number;
    stats?: { completedJobs?: number; avgRating?: number };
  };
}

export default function AdminTeamPage() {
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWorker, setEditingWorker] = useState<WorkerData | null>(null);
  const [editingSkillLevels, setEditingSkillLevels] = useState<Record<string, SkillLevel>>({});
  const [savingSkills, setSavingSkills] = useState(false);

  useEffect(() => {
    fetchWorkers();
  }, []);

  async function fetchWorkers() {
    try {
      const response = await fetch("/api/users?role=worker");
      const data = await response.json();
      if (data.success) {
        setWorkers(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch workers:", error);
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }

  function openSkillLevelEditor(worker: WorkerData) {
    const skillLevels: Record<string, SkillLevel> = {};
    worker.workerProfile?.skills?.forEach((skill) => {
      skillLevels[skill] = worker.workerProfile?.skillLevels?.[skill] || "mid";
    });
    setEditingSkillLevels(skillLevels);
    setEditingWorker(worker);
  }

  async function saveSkillLevels() {
    if (!editingWorker) return;
    setSavingSkills(true);
    try {
      const response = await fetch(`/api/users/${editingWorker._id}/skills`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillLevels: editingSkillLevels }),
      });
      const data = await response.json();
      if (data.success) {
        setWorkers((prev) =>
          prev.map((w) =>
            w._id === editingWorker._id
              ? { ...w, workerProfile: { ...w.workerProfile, skillLevels: editingSkillLevels } }
              : w
          )
        );
        toast.success("Skill levels updated");
        setEditingWorker(null);
      } else {
        toast.error(data.error?.message || "Failed to update skill levels");
      }
    } catch (error) {
      console.error("Failed to update skill levels:", error);
      toast.error("Failed to update skill levels");
    } finally {
      setSavingSkills(false);
    }
  }

  async function updateAvailability(workerId: string, availability: "available" | "busy" | "offline") {
    try {
      const response = await fetch(`/api/users/${workerId}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability }),
      });
      const data = await response.json();
      if (data.success) {
        setWorkers((prev) =>
          prev.map((w) =>
            w._id === workerId
              ? { ...w, workerProfile: { ...w.workerProfile, availability } }
              : w
          )
        );
        toast.success("Availability updated");
      } else {
        toast.error(data.error?.message || "Failed to update availability");
      }
    } catch (error) {
      console.error("Failed to update availability:", error);
      toast.error("Failed to update availability");
    }
  }

  const availableCount = workers.filter((w) => w.workerProfile?.availability === "available").length;
  const busyCount = workers.filter((w) => w.workerProfile?.availability === "busy").length;
  const offlineCount = workers.filter((w) => w.workerProfile?.availability === "offline").length;
  const totalCurrentJobs = workers.reduce((sum, w) => sum + (w.workerProfile?.currentJobCount || 0), 0);
  const totalCapacity = workers.reduce((sum, w) => sum + (w.workerProfile?.maxConcurrentJobs || 3), 0);

  return (
    <div className="min-h-screen bg-[var(--nimmit-bg-primary)]">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-[var(--nimmit-text-primary)]">
            Team Management
          </h1>
          <p className="text-[var(--nimmit-text-secondary)] mt-2">
            Manage your team&apos;s availability and workload
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <StatsCard label="Total" value={workers.length} icon="users" delay={0} />
          <StatsCard label="Available" value={availableCount} icon="check" color="success" delay={1} />
          <StatsCard label="Busy" value={busyCount} icon="clock" color="warning" delay={2} />
          <StatsCard label="Offline" value={offlineCount} icon="offline" color="tertiary" delay={3} />
          <StatsCard label="Workload" value={`${totalCurrentJobs}/${totalCapacity}`} icon="chart" delay={4} />
        </div>

        {/* Team Grid */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-5">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-display">Team Members</CardTitle>
            <CardDescription>All registered workers and their current status</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonGrid />
            ) : workers.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {workers.map((worker, i) => (
                  <WorkerCard
                    key={worker._id}
                    worker={worker}
                    index={i}
                    onEditSkills={() => openSkillLevelEditor(worker)}
                    onUpdateAvailability={(av) => updateAvailability(worker._id, av)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skill Level Editor Dialog */}
        <Dialog open={!!editingWorker} onOpenChange={() => setEditingWorker(null)}>
          <DialogContent className="max-w-md bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)]">
            <DialogHeader>
              <DialogTitle className="font-display">
                Edit Skills - {editingWorker?.profile.firstName} {editingWorker?.profile.lastName}
              </DialogTitle>
              <DialogDescription>Set the proficiency level for each skill</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {editingWorker?.workerProfile?.skills?.map((skill) => (
                <div key={skill} className="flex items-center justify-between gap-4">
                  <span className="font-medium text-[var(--nimmit-text-primary)]">{skill}</span>
                  <Select
                    value={editingSkillLevels[skill] || "mid"}
                    onValueChange={(value) =>
                      setEditingSkillLevels((prev) => ({ ...prev, [skill]: value as SkillLevel }))
                    }
                  >
                    <SelectTrigger className="w-[120px] border-[var(--nimmit-border)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)]">
                      {(["junior", "mid", "senior"] as SkillLevel[]).map((level) => (
                        <SelectItem key={level} value={level}>
                          <span className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${level === "junior" ? "bg-[var(--nimmit-info)]" : level === "mid" ? "bg-[var(--nimmit-warning)]" : "bg-[var(--nimmit-success)]"}`} />
                            {skillLevelConfig[level].label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingWorker(null)} className="border-[var(--nimmit-border)]">Cancel</Button>
              <Button onClick={saveSkillLevels} disabled={savingSkills} className="bg-[var(--nimmit-accent-primary)] hover:bg-[var(--nimmit-accent-primary-hover)]">
                {savingSkills ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Stats Card
function StatsCard({ label, value, icon, color, delay }: { label: string; value: string | number; icon: string; color?: "success" | "warning" | "tertiary"; delay: number }) {
  const icons: Record<string, React.ReactNode> = {
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
    clock: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    offline: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />,
    chart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  };
  const colors = {
    success: { bg: "bg-[var(--nimmit-success)]/10", text: "text-[var(--nimmit-success)]", border: "border-[var(--nimmit-success)]/30" },
    warning: { bg: "bg-[var(--nimmit-warning)]/10", text: "text-[var(--nimmit-warning)]", border: "" },
    tertiary: { bg: "bg-[var(--nimmit-bg-secondary)]", text: "text-[var(--nimmit-text-tertiary)]", border: "" },
  };
  const c = color ? colors[color] : { bg: "bg-[var(--nimmit-accent-primary)]/10", text: "text-[var(--nimmit-accent-primary)]", border: "" };

  return (
    <Card className={`border-[var(--nimmit-border)] ${c.border} shadow-sm animate-fade-up stagger-${delay + 1}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          <div className={`p-2 rounded-lg ${c.bg}`}>
            <svg className={`w-5 h-5 ${c.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">{icons[icon]}</svg>
          </div>
        </div>
        <CardTitle className={`text-3xl font-display ${c.text}`}>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

// Worker Card
function WorkerCard({ worker, index, onEditSkills, onUpdateAvailability }: {
  worker: WorkerData;
  index: number;
  onEditSkills: () => void;
  onUpdateAvailability: (av: "available" | "busy" | "offline") => void;
}) {
  const availability = worker.workerProfile?.availability || "offline";
  const currentJobs = worker.workerProfile?.currentJobCount || 0;
  const maxJobs = worker.workerProfile?.maxConcurrentJobs || 3;
  const isAtCapacity = currentJobs >= maxJobs;

  return (
    <div
      className="p-4 rounded-xl border border-[var(--nimmit-border)] bg-[var(--nimmit-bg-elevated)] hover:shadow-md transition-all"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--nimmit-accent-primary)]/10 flex items-center justify-center">
            <span className="font-medium text-[var(--nimmit-accent-primary)]">
              {worker.profile.firstName[0]}{worker.profile.lastName[0]}
            </span>
          </div>
          <div>
            <p className="font-medium text-[var(--nimmit-text-primary)]">
              {worker.profile.firstName} {worker.profile.lastName}
            </p>
            <p className="text-xs text-[var(--nimmit-text-tertiary)]">{worker.email}</p>
          </div>
        </div>
        <Select value={availability} onValueChange={onUpdateAvailability}>
          <SelectTrigger className="w-[110px] h-8 text-xs border-[var(--nimmit-border)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)]">
            <SelectItem value="available">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--nimmit-success)]" /> Available</span>
            </SelectItem>
            <SelectItem value="busy">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--nimmit-warning)]" /> Busy</span>
            </SelectItem>
            <SelectItem value="offline">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-gray-400" /> Offline</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Skills */}
      <div className="mb-3">
        <div className="flex flex-wrap gap-1 items-center">
          {worker.workerProfile?.skills?.slice(0, 3).map((skill) => {
            const level = worker.workerProfile?.skillLevels?.[skill] || "mid";
            return (
              <Badge key={skill} variant="outline" className={`text-xs ${skillLevelConfig[level].color}`} title={`${skill} - ${skillLevelConfig[level].label}`}>
                {skill}
              </Badge>
            );
          })}
          {(worker.workerProfile?.skills?.length || 0) > 3 && (
            <Badge variant="outline" className="text-xs border-[var(--nimmit-border)]">
              +{(worker.workerProfile?.skills?.length || 0) - 3}
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-[var(--nimmit-text-tertiary)]" onClick={onEditSkills}>
            Edit
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[var(--nimmit-text-tertiary)]">Jobs: </span>
            <span className={isAtCapacity ? "text-[var(--nimmit-error)] font-medium" : ""}>{currentJobs}/{maxJobs}</span>
          </div>
          <div>
            <span className="text-[var(--nimmit-text-tertiary)]">Done: </span>
            <span>{worker.workerProfile?.stats?.completedJobs || 0}</span>
          </div>
        </div>
        {worker.workerProfile?.stats?.avgRating && (
          <span className="text-yellow-500">{worker.workerProfile.stats.avgRating.toFixed(1)} ★</span>
        )}
      </div>
    </div>
  );
}

// Skeleton Grid
function SkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="p-4 rounded-xl border border-[var(--nimmit-border)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 skeleton rounded-full" />
            <div className="space-y-2">
              <div className="h-4 w-32 skeleton rounded" />
              <div className="h-3 w-24 skeleton rounded" />
            </div>
          </div>
          <div className="flex gap-1 mb-3">
            <div className="h-5 w-16 skeleton rounded-full" />
            <div className="h-5 w-16 skeleton rounded-full" />
          </div>
          <div className="h-4 w-full skeleton rounded" />
        </div>
      ))}
    </div>
  );
}

// Empty State
function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--nimmit-bg-secondary)] flex items-center justify-center">
        <svg className="w-8 h-8 text-[var(--nimmit-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-[var(--nimmit-text-primary)] mb-2">No team members yet</h3>
      <p className="text-[var(--nimmit-text-secondary)]">Workers will appear here when they register.</p>
    </div>
  );
}
