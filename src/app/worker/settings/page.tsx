"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import type { WorkerAvailability } from "@/types";

interface WorkerSettings {
  availability: WorkerAvailability;
  maxConcurrentJobs: number;
  notifications: {
    newJobs: boolean;
    messages: boolean;
  };
}

export default function WorkerSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<WorkerSettings>({
    availability: "offline",
    maxConcurrentJobs: 3,
    notifications: {
      newJobs: true,
      messages: true,
    },
  });

  // Password state
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch("/api/users/me/settings");
        const data = await response.json();
        if (data.success && data.data) {
          setSettings({
            availability: data.data.availability || "offline",
            maxConcurrentJobs: data.data.maxConcurrentJobs || 3,
            notifications: data.data.notifications || { newJobs: true, messages: true },
          });
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  async function handleSaveSettings() {
    setSaving(true);
    try {
      const response = await fetch("/api/users/me/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Settings saved successfully");
      } else {
        toast.error(data.error?.message || "Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (passwords.new !== passwords.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwords.new.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Password changed successfully");
        setPasswords({ current: "", new: "", confirm: "" });
      } else {
        toast.error(data.error?.message || "Failed to change password");
      }
    } catch {
      toast.error("Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  }

  const firstName = session?.user?.name?.split(" ")[0] || "Worker";

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-[var(--nimmit-bg-primary)]">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-[var(--nimmit-text-primary)]">
            Settings
          </h1>
          <p className="text-[var(--nimmit-text-secondary)] mt-2">
            Manage your availability, preferences, and account settings
          </p>
        </div>

        {/* Availability Control */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-1">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--nimmit-accent-primary)]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--nimmit-accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-lg font-display">Availability Status</CardTitle>
                <CardDescription>Set your current availability for new job assignments</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={settings.availability}
              onValueChange={(value) => setSettings({ ...settings, availability: value as WorkerAvailability })}
              className="space-y-3"
            >
              <AvailabilityOption
                value="available"
                label="Available"
                description="Ready to receive new job assignments"
                color="success"
              />
              <AvailabilityOption
                value="busy"
                label="Busy"
                description="Working on current jobs, no new assignments"
                color="warning"
              />
              <AvailabilityOption
                value="offline"
                label="Offline"
                description="Not available for any assignments"
                color="secondary"
              />
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Job Capacity */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--nimmit-accent-secondary)]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--nimmit-accent-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-lg font-display">Job Capacity</CardTitle>
                <CardDescription>Maximum number of jobs you can work on simultaneously</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-[var(--nimmit-text-secondary)]">
                  Max Concurrent Jobs
                </Label>
                <span className="text-2xl font-display font-semibold text-[var(--nimmit-accent-primary)]">
                  {settings.maxConcurrentJobs}
                </span>
              </div>
              <Slider
                value={[settings.maxConcurrentJobs]}
                onValueChange={(value) => setSettings({ ...settings, maxConcurrentJobs: value[0] })}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[var(--nimmit-text-tertiary)]">
                <span>1 job</span>
                <span>5 jobs</span>
              </div>
            </div>
            <p className="text-sm text-[var(--nimmit-text-secondary)] bg-[var(--nimmit-bg-secondary)] p-3 rounded-lg">
              Set a lower number if you want to focus deeply on fewer tasks, or increase it if you can manage multiple projects efficiently.
            </p>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-3">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--nimmit-accent-tertiary)]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--nimmit-accent-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-lg font-display">Notification Preferences</CardTitle>
                <CardDescription>Choose which notifications you want to receive</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--nimmit-border)] bg-[var(--nimmit-bg-elevated)]">
              <div className="space-y-0.5">
                <Label htmlFor="new-jobs" className="font-medium text-[var(--nimmit-text-primary)]">
                  New Job Alerts
                </Label>
                <p className="text-sm text-[var(--nimmit-text-secondary)]">
                  Get notified when a new job is assigned to you
                </p>
              </div>
              <Switch
                id="new-jobs"
                checked={settings.notifications.newJobs}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, newJobs: checked },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--nimmit-border)] bg-[var(--nimmit-bg-elevated)]">
              <div className="space-y-0.5">
                <Label htmlFor="messages" className="font-medium text-[var(--nimmit-text-primary)]">
                  Message Notifications
                </Label>
                <p className="text-sm text-[var(--nimmit-text-secondary)]">
                  Get notified when clients send you messages
                </p>
              </div>
              <Switch
                id="messages"
                checked={settings.notifications.messages}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, messages: checked },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Settings Button */}
        <div className="flex justify-end animate-fade-up stagger-4">
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="bg-[var(--nimmit-accent-primary)] hover:bg-[var(--nimmit-accent-primary-hover)] text-white px-8"
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        {/* Password Change */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-5">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--nimmit-error)]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--nimmit-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-lg font-display">Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password" className="text-sm font-medium text-[var(--nimmit-text-secondary)]">
                Current Password
              </Label>
              <Input
                id="current-password"
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                className="border-[var(--nimmit-border)] focus:border-[var(--nimmit-accent-primary)]"
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-medium text-[var(--nimmit-text-secondary)]">
                New Password
              </Label>
              <Input
                id="new-password"
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                className="border-[var(--nimmit-border)] focus:border-[var(--nimmit-accent-primary)]"
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-medium text-[var(--nimmit-text-secondary)]">
                Confirm New Password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                className="border-[var(--nimmit-border)] focus:border-[var(--nimmit-accent-primary)]"
                placeholder="Confirm new password"
              />
            </div>
            <div className="pt-2">
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !passwords.current || !passwords.new || !passwords.confirm}
                variant="outline"
                className="border-[var(--nimmit-border)] hover:bg-[var(--nimmit-bg-secondary)]"
              >
                {changingPassword ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Info Placeholder */}
        <Card className="border-[var(--nimmit-border)] border-dashed shadow-sm animate-fade-up stagger-6">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--nimmit-info)]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--nimmit-info)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-lg font-display">Payment Information</CardTitle>
                <CardDescription>Connect your account to receive payments</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--nimmit-bg-secondary)] flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--nimmit-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-[var(--nimmit-text-primary)] mb-2">Coming Soon</h3>
              <p className="text-[var(--nimmit-text-secondary)] max-w-sm mx-auto">
                Stripe Connect integration is on the way. You&apos;ll be able to connect your bank account and receive payments directly.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer Help */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-7">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--nimmit-accent-tertiary)]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--nimmit-accent-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-[var(--nimmit-text-primary)]">Need help, {firstName}?</p>
                <p className="text-sm text-[var(--nimmit-text-tertiary)]">Contact the admin team for support</p>
              </div>
            </div>
            <Button variant="outline" className="border-[var(--nimmit-border)]">Contact Support</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Availability Option Component
function AvailabilityOption({
  value,
  label,
  description,
  color,
}: {
  value: string;
  label: string;
  description: string;
  color: "success" | "warning" | "secondary";
}) {
  const colorClasses = {
    success: {
      dot: "bg-[var(--nimmit-success)]",
      selected: "border-[var(--nimmit-success)]/50 bg-[var(--nimmit-success-bg)]/30",
    },
    warning: {
      dot: "bg-[var(--nimmit-warning)]",
      selected: "border-[var(--nimmit-warning)]/50 bg-[var(--nimmit-warning-bg)]/30",
    },
    secondary: {
      dot: "bg-[var(--nimmit-text-tertiary)]",
      selected: "border-[var(--nimmit-border)] bg-[var(--nimmit-bg-secondary)]",
    },
  };

  return (
    <Label
      htmlFor={value}
      className="flex items-center gap-4 p-4 rounded-xl border border-[var(--nimmit-border)] cursor-pointer transition-all duration-200 hover:border-[var(--nimmit-accent-primary)]/30 has-[[data-state=checked]]:border-[var(--nimmit-accent-primary)] has-[[data-state=checked]]:bg-[var(--nimmit-accent-primary)]/5"
    >
      <RadioGroupItem value={value} id={value} className="sr-only" />
      <div className={`w-3 h-3 rounded-full ${colorClasses[color].dot}`} />
      <div className="flex-1">
        <p className="font-medium text-[var(--nimmit-text-primary)]">{label}</p>
        <p className="text-sm text-[var(--nimmit-text-secondary)]">{description}</p>
      </div>
      <div className="w-5 h-5 rounded-full border-2 border-[var(--nimmit-border)] flex items-center justify-center [[data-state=checked]_&]:border-[var(--nimmit-accent-primary)] [[data-state=checked]_&]:bg-[var(--nimmit-accent-primary)]">
        <svg
          className="w-3 h-3 text-white opacity-0 [[data-state=checked]_&]:opacity-100"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </Label>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--nimmit-bg-primary)]">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Header Skeleton */}
        <div className="space-y-4">
          <div className="h-10 w-48 skeleton rounded" />
          <div className="h-5 w-80 skeleton rounded" />
        </div>

        {/* Availability Card Skeleton */}
        <div className="rounded-xl border border-[var(--nimmit-border)] p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 skeleton rounded-xl" />
            <div className="space-y-2">
              <div className="h-5 w-40 skeleton rounded" />
              <div className="h-4 w-64 skeleton rounded" />
            </div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 skeleton rounded-xl" />
            ))}
          </div>
        </div>

        {/* Job Capacity Skeleton */}
        <div className="rounded-xl border border-[var(--nimmit-border)] p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 skeleton rounded-xl" />
            <div className="space-y-2">
              <div className="h-5 w-32 skeleton rounded" />
              <div className="h-4 w-72 skeleton rounded" />
            </div>
          </div>
          <div className="h-6 skeleton rounded" />
        </div>

        {/* Notifications Skeleton */}
        <div className="rounded-xl border border-[var(--nimmit-border)] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 skeleton rounded-xl" />
            <div className="space-y-2">
              <div className="h-5 w-48 skeleton rounded" />
              <div className="h-4 w-56 skeleton rounded" />
            </div>
          </div>
          {[1, 2].map((i) => (
            <div key={i} className="h-20 skeleton rounded-xl" />
          ))}
        </div>

        {/* Password Skeleton */}
        <div className="rounded-xl border border-[var(--nimmit-border)] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 skeleton rounded-xl" />
            <div className="space-y-2">
              <div className="h-5 w-40 skeleton rounded" />
              <div className="h-4 w-52 skeleton rounded" />
            </div>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-32 skeleton rounded" />
              <div className="h-10 skeleton rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
