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

// US Timezones
const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
];

interface PreferredWorker {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface ProfileData {
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    avatar?: string;
    timezone: string;
  };
  clientProfile: {
    company?: string;
    preferredWorker?: PreferredWorker;
  };
}

export default function ClientProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [company, setCompany] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();

  useEffect(() => {
    fetchProfile();
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
        setCompany(p.clientProfile?.company || "");
        setAvatarPreview(p.profile.avatar);
      }
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
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
          clientProfile: {
            company: company || undefined,
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
                clientProfile: { ...prev.clientProfile, company },
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

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-[var(--nimmit-bg-primary)]">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-[var(--nimmit-text-primary)]">
            Profile
          </h1>
          <p className="text-[var(--nimmit-text-secondary)] mt-2">
            Manage your personal and company information
          </p>
        </div>

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
                    {getInitials(firstName || "N", lastName || "A")}
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
                  placeholder="John"
                  className="border-[var(--nimmit-border)]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
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

        {/* Company Info Card */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-2">
          <CardHeader>
            <CardTitle className="text-lg font-display">Company Information</CardTitle>
            <CardDescription>Your business details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc."
                className="border-[var(--nimmit-border)]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Timezone Card */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-3">
          <CardHeader>
            <CardTitle className="text-lg font-display">Timezone</CardTitle>
            <CardDescription>
              Set your timezone to help coordinate with your assistant
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
                  {US_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Preferred Worker Card */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-4">
          <CardHeader>
            <CardTitle className="text-lg font-display">Preferred Assistant</CardTitle>
            <CardDescription>
              Your dedicated assistant who handles your tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile?.clientProfile?.preferredWorker ? (
              <div className="flex items-center gap-4 p-4 bg-[var(--nimmit-bg-secondary)] rounded-xl border border-[var(--nimmit-border)]">
                <Avatar className="w-12 h-12 border-2 border-[var(--nimmit-accent-primary)]/20">
                  <AvatarImage
                    src={profile.clientProfile.preferredWorker.avatar}
                    alt={`${profile.clientProfile.preferredWorker.firstName} ${profile.clientProfile.preferredWorker.lastName}`}
                  />
                  <AvatarFallback className="bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)]">
                    {getInitials(
                      profile.clientProfile.preferredWorker.firstName,
                      profile.clientProfile.preferredWorker.lastName
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-[var(--nimmit-text-primary)]">
                    {profile.clientProfile.preferredWorker.firstName}{" "}
                    {profile.clientProfile.preferredWorker.lastName}
                  </p>
                  <p className="text-sm text-[var(--nimmit-text-tertiary)]">
                    Your dedicated assistant
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[var(--nimmit-bg-secondary)] rounded-xl border border-[var(--nimmit-border)] text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--nimmit-border)] mx-auto mb-3 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-[var(--nimmit-text-tertiary)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-[var(--nimmit-text-secondary)]">
                  No preferred assistant assigned yet
                </p>
                <p className="text-xs text-[var(--nimmit-text-tertiary)] mt-1">
                  An assistant will be assigned based on your project needs
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end animate-fade-up stagger-5">
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
          <div className="h-5 w-72 skeleton rounded" />
        </div>

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

        {/* Company Info Card Skeleton */}
        <div className="rounded-xl border border-[var(--nimmit-border)] p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-6 w-44 skeleton rounded" />
            <div className="h-4 w-36 skeleton rounded" />
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

        {/* Preferred Worker Card Skeleton */}
        <div className="rounded-xl border border-[var(--nimmit-border)] p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-6 w-40 skeleton rounded" />
            <div className="h-4 w-56 skeleton rounded" />
          </div>
          <div className="flex items-center gap-4 p-4 bg-[var(--nimmit-bg-secondary)] rounded-xl">
            <div className="w-12 h-12 rounded-full skeleton" />
            <div className="space-y-2">
              <div className="h-5 w-32 skeleton rounded" />
              <div className="h-4 w-40 skeleton rounded" />
            </div>
          </div>
        </div>

        {/* Save Button Skeleton */}
        <div className="flex justify-end">
          <div className="h-10 w-32 skeleton rounded" />
        </div>
      </div>
    </div>
  );
}
