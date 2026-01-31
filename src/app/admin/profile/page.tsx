"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Clock, Shield, Users, Settings, FileText, UserPlus } from "lucide-react";

// Common Timezones
const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "Asia/Phnom_Penh", label: "Cambodia Time (ICT)" },
  { value: "UTC", label: "UTC" },
];

interface ProfileData {
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    avatar?: string;
    timezone: string;
  };
}

interface ActivityLogEntry {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  icon: "shield" | "users" | "settings" | "file" | "user-plus";
}

// Mock activity log data
const MOCK_ACTIVITY_LOG: ActivityLogEntry[] = [
  {
    id: "1",
    action: "Application Approved",
    description: "Approved worker application for Sokha Kem",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    icon: "user-plus",
  },
  {
    id: "2",
    action: "Job Assigned",
    description: "Assigned job #1247 to Dara Chea",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    icon: "file",
  },
  {
    id: "3",
    action: "Team Updated",
    description: "Updated worker permissions for Sreymom Prak",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    icon: "users",
  },
  {
    id: "4",
    action: "Settings Changed",
    description: "Updated system notification preferences",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    icon: "settings",
  },
  {
    id: "5",
    action: "Application Rejected",
    description: "Rejected worker application for John Smith",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    icon: "shield",
  },
];

const activityIcons = {
  shield: Shield,
  users: Users,
  settings: Settings,
  file: FileText,
  "user-plus": UserPlus,
};

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();

  useEffect(() => {
    fetchProfile();
    fetchActivityLog();
  }, []);

  async function fetchProfile() {
    try {
      const response = await fetch("/api/users/me/profile");
      const data = await response.json();
      if (data.success && data.data) {
        const p = data.data as ProfileData;
        setProfile(p);
        setFirstName(p.profile.firstName);
        setLastName(p.profile.lastName);
        setPhone(p.profile.phone || "");
        setTimezone(p.profile.timezone || "America/Los_Angeles");
        setAvatarPreview(p.profile.avatar);
      }
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function fetchActivityLog() {
    // Placeholder: In the future, this would call GET /api/admin/activity-log
    // For now, use mock data
    try {
      // const response = await fetch("/api/admin/activity-log");
      // const data = await response.json();
      // if (data.success) {
      //   setActivityLog(data.data);
      // }
      setActivityLog(MOCK_ACTIVITY_LOG);
    } catch {
      // Silently fail for activity log
      setActivityLog(MOCK_ACTIVITY_LOG);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch("/api/users/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            firstName,
            lastName,
            phone: phone || undefined,
            timezone,
            avatar: avatarPreview,
          },
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Profile updated successfully");
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                profile: { ...prev.profile, firstName, lastName, phone, timezone, avatar: avatarPreview },
              }
            : null
        );
      } else {
        toast.error(data.error?.message || "Failed to update profile");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.success && data.data?.url) {
        setAvatarPreview(data.data.url);
        toast.success("Avatar uploaded");
      } else {
        // Fallback: use local preview if upload API not implemented
        const reader = new FileReader();
        reader.onload = (event) => {
          setAvatarPreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
        toast.info("Avatar preview updated (save to persist)");
      }
    } catch {
      // Fallback: use local preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      toast.info("Avatar preview updated (save to persist)");
    } finally {
      setUploading(false);
    }
  }

  function getInitials(first: string, last: string) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  }

  function formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-display font-medium text-[var(--nimmit-text-primary)]">
          Profile
        </h1>
        <p className="text-[var(--nimmit-text-secondary)] mt-1">
          Manage your admin account and preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Personal Info & Timezone */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info Card */}
          <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-1">
            <CardHeader>
              <CardTitle className="text-lg font-display">Personal Information</CardTitle>
              <CardDescription>Update your personal details and contact info</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="w-20 h-20 border-2 border-[var(--nimmit-border)]">
                    <AvatarImage src={avatarPreview} alt="Profile avatar" />
                    <AvatarFallback className="text-xl bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)]">
                      {getInitials(firstName || "A", lastName || "D")}
                    </AvatarFallback>
                  </Avatar>
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="border-[var(--nimmit-border)]"
                  >
                    {uploading ? "Uploading..." : "Change Avatar"}
                  </Button>
                  <p className="text-xs text-[var(--nimmit-text-tertiary)] mt-1">
                    JPG, PNG, or GIF. Max 5MB.
                  </p>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Admin"
                    className="border-[var(--nimmit-border)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="User"
                    className="border-[var(--nimmit-border)]"
                  />
                </div>
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile?.email || ""}
                  disabled
                  className="border-[var(--nimmit-border)] bg-[var(--nimmit-bg-secondary)] text-[var(--nimmit-text-tertiary)]"
                />
                <p className="text-xs text-[var(--nimmit-text-tertiary)]">
                  Email cannot be changed. Contact support if you need to update it.
                </p>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="border-[var(--nimmit-border)]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Timezone Card */}
          <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-2">
            <CardHeader>
              <CardTitle className="text-lg font-display">Timezone</CardTitle>
              <CardDescription>
                Set your timezone for scheduling and activity timestamps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="timezone">Your Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="w-full border-[var(--nimmit-border)]">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end animate-fade-up stagger-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[var(--nimmit-accent-primary)] hover:bg-[var(--nimmit-accent-primary-hover)] px-8"
            >
              {saving ? (
                <>
                  <svg
                    className="w-4 h-4 mr-2 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>

        {/* Right Column - Activity Log */}
        <div className="lg:col-span-1">
          <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-2">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Clock className="h-5 w-5 text-[var(--nimmit-text-tertiary)]" />
                Activity Log
              </CardTitle>
              <CardDescription>Your recent admin actions</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLog.length === 0 ? (
                <div className="text-center py-8 text-[var(--nimmit-text-tertiary)]">
                  <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activityLog.map((entry) => {
                    const IconComponent = activityIcons[entry.icon];
                    return (
                      <div
                        key={entry.id}
                        className="flex gap-3 pb-4 border-b border-[var(--nimmit-border)] last:border-0 last:pb-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-[var(--nimmit-bg-secondary)] flex items-center justify-center flex-shrink-0">
                          <IconComponent className="h-4 w-4 text-[var(--nimmit-text-tertiary)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--nimmit-text-primary)]">
                            {entry.action}
                          </p>
                          <p className="text-xs text-[var(--nimmit-text-tertiary)] truncate">
                            {entry.description}
                          </p>
                          <p className="text-xs text-[var(--nimmit-text-tertiary)] mt-1">
                            {formatRelativeTime(entry.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-9 w-32 skeleton rounded" />
        <div className="h-5 w-64 skeleton rounded" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info Card Skeleton */}
          <div className="rounded-xl border border-[var(--nimmit-border)] p-6 space-y-6">
            <div className="space-y-2">
              <div className="h-6 w-40 skeleton rounded" />
              <div className="h-4 w-56 skeleton rounded" />
            </div>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full skeleton" />
              <div className="space-y-2">
                <div className="h-8 w-28 skeleton rounded" />
                <div className="h-3 w-32 skeleton rounded" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="h-4 w-20 skeleton rounded" />
                <div className="h-10 skeleton rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-20 skeleton rounded" />
                <div className="h-10 skeleton rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 skeleton rounded" />
              <div className="h-10 skeleton rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-28 skeleton rounded" />
              <div className="h-10 skeleton rounded" />
            </div>
          </div>

          {/* Timezone Card Skeleton */}
          <div className="rounded-xl border border-[var(--nimmit-border)] p-6 space-y-4">
            <div className="space-y-2">
              <div className="h-6 w-24 skeleton rounded" />
              <div className="h-4 w-64 skeleton rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-28 skeleton rounded" />
              <div className="h-10 skeleton rounded" />
            </div>
          </div>

          {/* Save Button Skeleton */}
          <div className="flex justify-end">
            <div className="h-10 w-32 skeleton rounded" />
          </div>
        </div>

        {/* Right Column - Activity Log Skeleton */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-[var(--nimmit-border)] p-6 space-y-4">
            <div className="space-y-2">
              <div className="h-6 w-32 skeleton rounded" />
              <div className="h-4 w-40 skeleton rounded" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3 pb-4 border-b border-[var(--nimmit-border)] last:border-0">
                  <div className="w-8 h-8 rounded-full skeleton" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 skeleton rounded" />
                    <div className="h-3 w-full skeleton rounded" />
                    <div className="h-3 w-16 skeleton rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
