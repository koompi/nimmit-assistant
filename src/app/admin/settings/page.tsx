"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bell, Lock, Settings, ArrowRight, HelpCircle } from "lucide-react";

interface AdminSettings {
  notifications: {
    newWorkerApplications: boolean;
    systemAlerts: boolean;
    jobEscalations: boolean;
  };
}

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<AdminSettings>({
    notifications: {
      newWorkerApplications: true,
      systemAlerts: true,
      jobEscalations: true,
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
            notifications: data.data.notifications || {
              newWorkerApplications: true,
              systemAlerts: true,
              jobEscalations: true,
            },
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

  const firstName = session?.user?.name?.split(" ")[0] || "Admin";

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
            Manage your notification preferences and account settings
          </p>
        </div>

        {/* Notification Preferences */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-1">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--nimmit-accent-primary)]/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-[var(--nimmit-accent-primary)]" />
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
                <Label htmlFor="new-applications" className="font-medium text-[var(--nimmit-text-primary)]">
                  New Worker Applications
                </Label>
                <p className="text-sm text-[var(--nimmit-text-secondary)]">
                  Get notified when new worker applications are submitted
                </p>
              </div>
              <Switch
                id="new-applications"
                checked={settings.notifications.newWorkerApplications}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, newWorkerApplications: checked },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--nimmit-border)] bg-[var(--nimmit-bg-elevated)]">
              <div className="space-y-0.5">
                <Label htmlFor="system-alerts" className="font-medium text-[var(--nimmit-text-primary)]">
                  System Alerts
                </Label>
                <p className="text-sm text-[var(--nimmit-text-secondary)]">
                  Receive alerts about system issues and maintenance
                </p>
              </div>
              <Switch
                id="system-alerts"
                checked={settings.notifications.systemAlerts}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, systemAlerts: checked },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--nimmit-border)] bg-[var(--nimmit-bg-elevated)]">
              <div className="space-y-0.5">
                <Label htmlFor="job-escalations" className="font-medium text-[var(--nimmit-text-primary)]">
                  Job Escalations
                </Label>
                <p className="text-sm text-[var(--nimmit-text-secondary)]">
                  Get notified when jobs require admin intervention
                </p>
              </div>
              <Switch
                id="job-escalations"
                checked={settings.notifications.jobEscalations}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, jobEscalations: checked },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Settings Button */}
        <div className="flex justify-end animate-fade-up stagger-2">
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="bg-[var(--nimmit-accent-primary)] hover:bg-[var(--nimmit-accent-primary-hover)] text-white px-8"
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        {/* Password Change */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-3">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--nimmit-error)]/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-[var(--nimmit-error)]" />
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

        {/* System Settings Placeholder */}
        <Card className="border-[var(--nimmit-border)] border-dashed shadow-sm animate-fade-up stagger-4 opacity-60">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--nimmit-info)]/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-[var(--nimmit-info)]" />
              </div>
              <div>
                <CardTitle className="text-lg font-display">System Configuration</CardTitle>
                <CardDescription>Platform-wide settings and configurations</CardDescription>
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
              <p className="text-[var(--nimmit-text-secondary)] max-w-sm mx-auto mb-6">
                Advanced system configuration options including pricing tiers, service categories, and platform policies.
              </p>
              <Button variant="outline" disabled className="gap-2">
                <span>Configure System</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Help */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-5">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--nimmit-accent-tertiary)]/10 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-[var(--nimmit-accent-tertiary)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--nimmit-text-primary)]">Need help, {firstName}?</p>
                <p className="text-sm text-[var(--nimmit-text-tertiary)]">View documentation or contact support</p>
              </div>
            </div>
            <Button variant="outline" className="border-[var(--nimmit-border)]">View Documentation</Button>
          </CardContent>
        </Card>
      </div>
    </div>
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

        {/* Notifications Card Skeleton */}
        <div className="rounded-xl border border-[var(--nimmit-border)] p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 skeleton rounded-xl" />
            <div className="space-y-2">
              <div className="h-5 w-48 skeleton rounded" />
              <div className="h-4 w-64 skeleton rounded" />
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 skeleton rounded-xl" />
            ))}
          </div>
        </div>

        {/* Save Button Skeleton */}
        <div className="flex justify-end">
          <div className="h-10 w-32 skeleton rounded-lg" />
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

        {/* System Config Skeleton */}
        <div className="rounded-xl border border-[var(--nimmit-border)] border-dashed p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 skeleton rounded-xl" />
            <div className="space-y-2">
              <div className="h-5 w-44 skeleton rounded" />
              <div className="h-4 w-60 skeleton rounded" />
            </div>
          </div>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 skeleton rounded-2xl" />
            <div className="h-6 w-32 mx-auto mb-2 skeleton rounded" />
            <div className="h-4 w-64 mx-auto skeleton rounded" />
          </div>
        </div>

        {/* Footer Skeleton */}
        <div className="rounded-xl border border-[var(--nimmit-border)] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 skeleton rounded-xl" />
              <div className="space-y-2">
                <div className="h-5 w-36 skeleton rounded" />
                <div className="h-4 w-48 skeleton rounded" />
              </div>
            </div>
            <div className="h-10 w-36 skeleton rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
