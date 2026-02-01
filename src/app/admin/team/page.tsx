"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
  junior: { label: "Junior", color: "bg-[var(--nimmit-info)]/10 text-[var(--nimmit-info)] border-[var(--nimmit-info)]/20" },
  mid: { label: "Mid", color: "bg-[var(--nimmit-warning)]/10 text-[var(--nimmit-warning)] border-[var(--nimmit-warning)]/20" },
  senior: { label: "Senior", color: "bg-[var(--nimmit-success)]/10 text-[var(--nimmit-success)] border-[var(--nimmit-success)]/20" },
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
  // const offlineCount = workers.filter((w) => w.workerProfile?.availability === "offline").length;

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-semibold text-[var(--nimmit-text-primary)]">
            Team Management
          </h1>
          <p className="text-sm text-[var(--nimmit-text-tertiary)]">
            {workers.length} team members
          </p>
        </div>
      </div>

      {/* Compact Stats Bar */}
      <div className="flex items-center gap-6 py-3 px-4 bg-[var(--nimmit-bg-elevated)] rounded-lg border border-[var(--nimmit-border)]">
        <StatItem label="Total Team" value={workers.length} color="primary" />
        <div className="w-px h-8 bg-[var(--nimmit-border)]" />
        <StatItem label="Available" value={availableCount} color="success" />
        <div className="w-px h-8 bg-[var(--nimmit-border)]" />
        <StatItem label="Busy" value={busyCount} color="warning" />
      </div>

      {/* Team List Table */}
      <div className="bg-[var(--nimmit-bg-elevated)] rounded-lg border border-[var(--nimmit-border)]">
        <div className="px-4 py-3 border-b border-[var(--nimmit-border)] bg-[var(--nimmit-bg-secondary)]/30 grid grid-cols-12 gap-4 text-xs font-medium text-[var(--nimmit-text-tertiary)] uppercase tracking-wider">
          <div className="col-span-3">Member</div>
          <div className="col-span-2">Availability</div>
          <div className="col-span-4">Skills</div>
          <div className="col-span-2">Workload</div>
          <div className="col-span-1 text-right">Rating</div>
        </div>
        <div className="divide-y divide-[var(--nimmit-border)]">
          {loading ? (
            <SkeletonRows count={5} />
          ) : workers.length === 0 ? (
            <EmptyState />
          ) : (
            workers.map((worker) => (
              <WorkerRow
                key={worker._id}
                worker={worker}
                onEditSkills={() => openSkillLevelEditor(worker)}
                onUpdateAvailability={(av) => updateAvailability(worker._id, av)}
              />
            ))
          )}
        </div>
      </div>

      {/* Skill Level Editor Dialog */}
      <Dialog open={!!editingWorker} onOpenChange={() => setEditingWorker(null)}>
        <DialogContent className="max-w-md bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)]">
          <DialogHeader>
            <DialogTitle className="font-display">
              Edit Skills
            </DialogTitle>
            <DialogDescription>
              {editingWorker?.profile.firstName} {editingWorker?.profile.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {editingWorker?.workerProfile?.skills?.map((skill) => (
              <div key={skill} className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-[var(--nimmit-text-primary)]">{skill}</span>
                <Select
                  value={editingSkillLevels[skill] || "mid"}
                  onValueChange={(value) =>
                    setEditingSkillLevels((prev) => ({ ...prev, [skill]: value as SkillLevel }))
                  }
                >
                  <SelectTrigger className="w-[110px] h-8 text-xs border-[var(--nimmit-border)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)]">
                    {(["junior", "mid", "senior"] as SkillLevel[]).map((level) => (
                      <SelectItem key={level} value={level}>
                        <span className="flex items-center gap-2 text-xs">
                          <span className={`h-1.5 w-1.5 rounded-full ${level === "junior" ? "bg-[var(--nimmit-info)]" : level === "mid" ? "bg-[var(--nimmit-warning)]" : "bg-[var(--nimmit-success)]"}`} />
                          {skillLevelConfig[level].label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" size="sm" onClick={() => setEditingWorker(null)}>Cancel</Button>
            <Button size="sm" onClick={saveSkillLevels} disabled={savingSkills}>
              {savingSkills ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Compact Stat Item
function StatItem({ label, value, color }: {
  label: string;
  value: number;
  color: "primary" | "success" | "warning";
}) {
  const colors = {
    primary: "text-[var(--nimmit-accent-primary)]",
    success: "text-[var(--nimmit-success)]",
    warning: "text-[var(--nimmit-warning)]",
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`text-2xl font-semibold font-display ${colors[color]}`}>
        {value}
      </span>
      <span className="text-xs text-[var(--nimmit-text-tertiary)]">{label}</span>
    </div>
  );
}

// Dense Worker Row
function WorkerRow({ worker, onEditSkills, onUpdateAvailability }: {
  worker: WorkerData;
  onEditSkills: () => void;
  onUpdateAvailability: (av: "available" | "busy" | "offline") => void;
}) {
  const currentJobs = worker.workerProfile?.currentJobCount || 0;
  const maxJobs = worker.workerProfile?.maxConcurrentJobs || 3;
  const isAtCapacity = currentJobs >= maxJobs;

  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-2.5 items-center hover:bg-[var(--nimmit-bg-secondary)] transition-colors group">
      {/* Member */}
      <div className="col-span-3 flex items-center gap-3 overflow-hidden">
        <div className="w-8 h-8 rounded-full bg-[var(--nimmit-accent-primary)]/10 flex items-center justify-center shrink-0 text-xs font-medium text-[var(--nimmit-accent-primary)]">
          {worker.profile.firstName[0]}{worker.profile.lastName[0]}
        </div>
        <div className="truncate">
          <div className="text-sm font-medium text-[var(--nimmit-text-primary)] truncate">
            {worker.profile.firstName} {worker.profile.lastName}
          </div>
          <div className="text-xs text-[var(--nimmit-text-tertiary)] truncate">
            {worker.email}
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="col-span-2">
        <Select value={worker.workerProfile?.availability || "offline"} onValueChange={onUpdateAvailability}>
          <SelectTrigger className="w-[100px] h-7 text-xs border-[var(--nimmit-border)] bg-transparent hover:bg-[var(--nimmit-bg-secondary)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)]">
            <SelectItem value="available" className="text-xs">
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[var(--nimmit-success)]" /> Available</span>
            </SelectItem>
            <SelectItem value="busy" className="text-xs">
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[var(--nimmit-warning)]" /> Busy</span>
            </SelectItem>
            <SelectItem value="offline" className="text-xs">
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> Offline</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Skills */}
      <div className="col-span-4 flex items-center gap-1 flex-wrap">
        {worker.workerProfile?.skills?.slice(0, 2).map((skill) => {
          const level = worker.workerProfile?.skillLevels?.[skill] || "mid";
          return (
            <Badge key={skill} variant="outline" className={`h-5 px-1.5 text-[10px] font-normal ${skillLevelConfig[level].color}`}>
              {skill}
            </Badge>
          );
        })}
        {(worker.workerProfile?.skills?.length || 0) > 2 && (
          <span className="text-[10px] text-[var(--nimmit-text-tertiary)] ml-1">
            +{(worker.workerProfile?.skills?.length || 0) - 2} more
          </span>
        )}
        <button onClick={onEditSkills} className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          <svg className="w-3.5 h-3.5 text-[var(--nimmit-text-tertiary)] hover:text-[var(--nimmit-text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      {/* Workload */}
      <div className="col-span-2 text-sm flex items-center">
        <span className={`${isAtCapacity ? "text-[var(--nimmit-error)] font-medium" : "text-[var(--nimmit-text-primary)]"}`}>
          {currentJobs}
        </span>
        <span className="text-[var(--nimmit-text-tertiary)] mx-1">/</span>
        <span className="text-[var(--nimmit-text-tertiary)]">{maxJobs}</span>
        <div className="w-16 h-1.5 bg-[var(--nimmit-bg-secondary)] rounded-full ml-3 overflow-hidden hidden xl:block">
          <div
            className={`h-full rounded-full ${isAtCapacity ? "bg-[var(--nimmit-error)]" : "bg-[var(--nimmit-accent-primary)]"}`}
            style={{ width: `${Math.min((currentJobs / maxJobs) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Rating */}
      <div className="col-span-1 text-right text-sm">
        {worker.workerProfile?.stats?.avgRating ? (
          <span className="text-yellow-500 font-medium">{worker.workerProfile.stats.avgRating.toFixed(1)}</span>
        ) : (
          <span className="text-[var(--nimmit-text-tertiary)]">-</span>
        )}
      </div>
    </div>
  );
}

// Empty State
function EmptyState() {
  return (
    <div className="py-12 text-center text-[var(--nimmit-text-tertiary)] text-sm">
      No team members found
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
