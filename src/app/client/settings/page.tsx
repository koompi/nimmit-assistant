"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface NotificationPreferences {
  emailEnabled: boolean;
  emailJobAssigned: boolean;
  emailJobStarted: boolean;
  emailJobSubmitted: boolean;
  emailJobCompleted: boolean;
  emailJobRevision: boolean;
  emailNewMessage: boolean;
  emailPaymentReceived: boolean;
  emailWeeklyDigest: boolean;
  inAppEnabled: boolean;
}

interface UserSettings {
  notifications: NotificationPreferences;
  communication: {
    preferredMethod: "email" | "phone" | "both";
    urgentNotifications: boolean;
  };
}

const defaultSettings: UserSettings = {
  notifications: {
    emailEnabled: true,
    emailJobAssigned: true,
    emailJobStarted: true,
    emailJobSubmitted: true,
    emailJobCompleted: true,
    emailJobRevision: true,
    emailNewMessage: true,
    emailPaymentReceived: true,
    emailWeeklyDigest: false,
    inAppEnabled: true,
  },
  communication: {
    preferredMethod: "email",
    urgentNotifications: true,
  },
};

export default function ClientSettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Deactivation state
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/users/me/settings");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setSettings(data.data);
          }
        }
      } catch {
        // API may not exist yet - use defaults
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function saveSettings() {
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

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Password changed successfully");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast.error(data.error?.message || "Failed to change password");
      }
    } catch {
      toast.error("Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  }

  async function requestDeactivation() {
    setDeactivating(true);
    try {
      const response = await fetch("/api/users/me/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Deactivation request submitted. We will contact you shortly.");
        setShowDeactivateConfirm(false);
      } else {
        toast.error(data.error?.message || "Failed to submit deactivation request");
      }
    } catch {
      toast.error("Failed to submit deactivation request");
    } finally {
      setDeactivating(false);
    }
  }

  function updateNotification(key: keyof NotificationPreferences, value: boolean) {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
  }

  function updateCommunication<K extends keyof UserSettings["communication"]>(
    key: K,
    value: UserSettings["communication"][K]
  ) {
    setSettings(prev => ({
      ...prev,
      communication: { ...prev.communication, [key]: value },
    }));
  }

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
            Manage your account preferences and notifications
          </p>
        </div>

        {/* Email Notification Preferences */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-1">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--nimmit-accent-primary)]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--nimmit-accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-lg font-display">Email Notifications</CardTitle>
                <CardDescription>Choose which email notifications you receive</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Master Toggle */}
            <NotificationToggle
              id="emailEnabled"
              label="Email Notifications"
              description="Enable or disable all email notifications"
              checked={settings.notifications.emailEnabled}
              onCheckedChange={(checked) => updateNotification("emailEnabled", checked)}
            />

            {settings.notifications.emailEnabled && (
              <div className="space-y-4 pl-4 border-l-2 border-[var(--nimmit-border)]">
                <NotificationToggle
                  id="emailJobStarted"
                  label="Work Started"
                  description="When your assistant begins working on a job"
                  checked={settings.notifications.emailJobStarted}
                  onCheckedChange={(checked) => updateNotification("emailJobStarted", checked)}
                />
                <NotificationToggle
                  id="emailJobSubmitted"
                  label="Job Submitted"
                  description="When a job is submitted for your review"
                  checked={settings.notifications.emailJobSubmitted}
                  onCheckedChange={(checked) => updateNotification("emailJobSubmitted", checked)}
                />
                <NotificationToggle
                  id="emailJobCompleted"
                  label="Job Completed"
                  description="When a job has been approved and completed"
                  checked={settings.notifications.emailJobCompleted}
                  onCheckedChange={(checked) => updateNotification("emailJobCompleted", checked)}
                />
                <NotificationToggle
                  id="emailNewMessage"
                  label="New Messages"
                  description="When your assistant sends you a message"
                  checked={settings.notifications.emailNewMessage}
                  onCheckedChange={(checked) => updateNotification("emailNewMessage", checked)}
                />
                <NotificationToggle
                  id="emailWeeklyDigest"
                  label="Weekly Digest"
                  description="Weekly summary of your job activity and usage"
                  checked={settings.notifications.emailWeeklyDigest}
                  onCheckedChange={(checked) => updateNotification("emailWeeklyDigest", checked)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* In-App Notifications */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-1b">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--nimmit-accent-tertiary)]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--nimmit-accent-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-lg font-display">In-App Notifications</CardTitle>
                <CardDescription>Real-time notifications in the dashboard</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <NotificationToggle
              id="inAppEnabled"
              label="In-App Notifications"
              description="Show real-time notifications in the notification bell"
              checked={settings.notifications.inAppEnabled}
              onCheckedChange={(checked) => updateNotification("inAppEnabled", checked)}
            />
          </CardContent>
        </Card>

        {/* Communication Preferences */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--nimmit-accent-secondary)]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--nimmit-accent-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-lg font-display">Communication Preferences</CardTitle>
                <CardDescription>How you prefer to be contacted</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="preferredMethod">Preferred Contact Method</Label>
              <Select
                value={settings.communication.preferredMethod}
                onValueChange={(value) => updateCommunication("preferredMethod", value as "email" | "phone" | "both")}
              >
                <SelectTrigger className="w-full h-11 bg-[var(--nimmit-bg-secondary)] border-transparent rounded-[var(--nimmit-radius-lg)]">
                  <SelectValue placeholder="Select contact method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email only</SelectItem>
                  <SelectItem value="phone">Phone only</SelectItem>
                  <SelectItem value="both">Email and Phone</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-[var(--nimmit-text-tertiary)]">
                This is how your assistant will primarily contact you
              </p>
            </div>
            <NotificationToggle
              id="urgentNotifications"
              label="Urgent Notifications"
              description="Allow phone calls or texts for urgent matters even outside business hours"
              checked={settings.communication.urgentNotifications}
              onCheckedChange={(checked) => updateCommunication("urgentNotifications", checked)}
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end animate-fade-up stagger-3">
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="bg-[var(--nimmit-accent-primary)] hover:bg-[var(--nimmit-accent-primary-hover)] px-8"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Password Change */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-4">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--nimmit-accent-tertiary)]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--nimmit-accent-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-lg font-display">Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  minLength={8}
                />
              </div>
              <Button
                type="submit"
                disabled={changingPassword}
                variant="outline"
                className="border-[var(--nimmit-border)]"
              >
                {changingPassword ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-[var(--nimmit-error)]/30 shadow-sm animate-fade-up stagger-5">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--nimmit-error)]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--nimmit-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-lg font-display text-[var(--nimmit-error)]">Danger Zone</CardTitle>
                <CardDescription>Irreversible account actions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!showDeactivateConfirm ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-[var(--nimmit-error)]/5 rounded-xl border border-[var(--nimmit-error)]/20">
                <div>
                  <p className="font-medium text-[var(--nimmit-text-primary)]">Deactivate Account</p>
                  <p className="text-sm text-[var(--nimmit-text-tertiary)]">
                    Request to deactivate your account. Any pending jobs will need to be completed or canceled first.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowDeactivateConfirm(true)}
                  className="border-[var(--nimmit-error)]/30 text-[var(--nimmit-error)] hover:bg-[var(--nimmit-error)]/10 hover:text-[var(--nimmit-error)] shrink-0"
                >
                  Deactivate Account
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-[var(--nimmit-error)]/5 rounded-xl border border-[var(--nimmit-error)]/20 space-y-4">
                <p className="font-medium text-[var(--nimmit-error)]">Are you sure you want to deactivate your account?</p>
                <p className="text-sm text-[var(--nimmit-text-secondary)]">
                  This will submit a deactivation request. Our team will review it and contact you to confirm.
                  Your data will be retained for 30 days before permanent deletion.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeactivateConfirm(false)}
                    className="border-[var(--nimmit-border)]"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={requestDeactivation}
                    disabled={deactivating}
                    className="bg-[var(--nimmit-error)] hover:bg-[var(--nimmit-error)]/90 text-white"
                  >
                    {deactivating ? "Submitting..." : "Yes, Deactivate My Account"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Notification Toggle Component
function NotificationToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 bg-[var(--nimmit-bg-secondary)] rounded-xl">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-[var(--nimmit-text-primary)] cursor-pointer">
          {label}
        </Label>
        <p className="text-sm text-[var(--nimmit-text-tertiary)]">{description}</p>
      </div>
      <div className="shrink-0 pt-0.5">
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onCheckedChange(!checked)}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nimmit-accent-primary)] focus-visible:ring-offset-2
            ${checked ? "bg-[var(--nimmit-accent-primary)]" : "bg-[var(--nimmit-border)]"}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200
              ${checked ? "translate-x-6" : "translate-x-1"}
            `}
          />
        </button>
      </div>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--nimmit-bg-primary)]">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Header skeleton */}
        <div className="space-y-4">
          <div className="h-10 w-48 skeleton rounded" />
          <div className="h-5 w-64 skeleton rounded" />
        </div>

        {/* Notification Preferences skeleton */}
        <div className="rounded-xl border border-[var(--nimmit-border)] p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 skeleton rounded-xl" />
            <div className="space-y-2">
              <div className="h-5 w-48 skeleton rounded" />
              <div className="h-4 w-64 skeleton rounded" />
            </div>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-[var(--nimmit-bg-secondary)] rounded-xl">
              <div className="space-y-2">
                <div className="h-4 w-32 skeleton rounded" />
                <div className="h-3 w-56 skeleton rounded" />
              </div>
              <div className="h-6 w-11 skeleton rounded-full" />
            </div>
          ))}
        </div>

        {/* Communication Preferences skeleton */}
        <div className="rounded-xl border border-[var(--nimmit-border)] p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 skeleton rounded-xl" />
            <div className="space-y-2">
              <div className="h-5 w-56 skeleton rounded" />
              <div className="h-4 w-48 skeleton rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-40 skeleton rounded" />
            <div className="h-11 w-full skeleton rounded-lg" />
          </div>
          <div className="flex items-center justify-between p-4 bg-[var(--nimmit-bg-secondary)] rounded-xl">
            <div className="space-y-2">
              <div className="h-4 w-36 skeleton rounded" />
              <div className="h-3 w-64 skeleton rounded" />
            </div>
            <div className="h-6 w-11 skeleton rounded-full" />
          </div>
        </div>

        {/* Save button skeleton */}
        <div className="flex justify-end">
          <div className="h-10 w-32 skeleton rounded-lg" />
        </div>

        {/* Password Change skeleton */}
        <div className="rounded-xl border border-[var(--nimmit-border)] p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 skeleton rounded-xl" />
            <div className="space-y-2">
              <div className="h-5 w-40 skeleton rounded" />
              <div className="h-4 w-48 skeleton rounded" />
            </div>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-32 skeleton rounded" />
              <div className="h-11 w-full skeleton rounded-lg" />
            </div>
          ))}
          <div className="h-10 w-36 skeleton rounded-lg" />
        </div>

        {/* Danger Zone skeleton */}
        <div className="rounded-xl border border-[var(--nimmit-error)]/30 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 skeleton rounded-xl" />
            <div className="space-y-2">
              <div className="h-5 w-32 skeleton rounded" />
              <div className="h-4 w-48 skeleton rounded" />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-[var(--nimmit-bg-secondary)] rounded-xl">
            <div className="space-y-2">
              <div className="h-4 w-36 skeleton rounded" />
              <div className="h-3 w-80 skeleton rounded" />
            </div>
            <div className="h-10 w-40 skeleton rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
