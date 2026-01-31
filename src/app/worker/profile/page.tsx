"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { STANDARDIZED_SKILLS, SKILL_CATEGORIES } from "@/lib/constants/skills";
import type { SkillLevel, WorkerProfile, UserProfile } from "@/types";

interface WorkerProfileData {
  profile: UserProfile;
  workerProfile: WorkerProfile;
  email: string;
}

export default function WorkerProfilePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<WorkerProfileData | null>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillLevels, setSkillLevels] = useState<Record<string, SkillLevel>>({});
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  // Skill picker state
  const [addingSkill, setAddingSkill] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel>("mid");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch("/api/users/me/profile");
        const data = await response.json();
        if (data.success) {
          setProfileData(data.data);
          setFirstName(data.data.profile.firstName || "");
          setLastName(data.data.profile.lastName || "");
          setPhone(data.data.profile.phone || "");
          setBio(data.data.workerProfile?.bio || "");
          setSkills(data.data.workerProfile?.skills || []);
          setSkillLevels(data.data.workerProfile?.skillLevels || {});
          setPortfolioUrl(data.data.workerProfile?.portfolioUrl || "");
          setLinkedinUrl(data.data.workerProfile?.linkedinUrl || "");
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const response = await fetch("/api/users/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: { firstName, lastName, phone },
          workerProfile: { bio, skills, skillLevels, portfolioUrl, linkedinUrl },
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Profile updated successfully");
      } else {
        toast.error(data.error?.message || "Failed to update profile");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  function handleAddSkill() {
    if (!selectedSkill || skills.includes(selectedSkill)) {
      toast.error("Please select a valid skill");
      return;
    }
    setSkills([...skills, selectedSkill]);
    setSkillLevels({ ...skillLevels, [selectedSkill]: selectedLevel });
    setSelectedSkill("");
    setSelectedLevel("mid");
    setAddingSkill(false);
  }

  function handleRemoveSkill(skillId: string) {
    setSkills(skills.filter((s) => s !== skillId));
    const newLevels = { ...skillLevels };
    delete newLevels[skillId];
    setSkillLevels(newLevels);
  }

  function handleUpdateSkillLevel(skillId: string, level: SkillLevel) {
    setSkillLevels({ ...skillLevels, [skillId]: level });
  }

  function getSkillLabel(skillId: string) {
    const skill = STANDARDIZED_SKILLS.find((s) => s.id === skillId);
    return skill?.label || skillId;
  }

  function getSkillLevelBadge(level: SkillLevel) {
    const config = {
      junior: { className: "bg-gray-100 text-gray-600 border-gray-200", label: "Junior" },
      mid: { className: "bg-[var(--nimmit-info-bg)] text-[var(--nimmit-info)] border-[var(--nimmit-info)]/20", label: "Mid" },
      senior: { className: "bg-amber-50 text-amber-600 border-amber-200", label: "Senior" },
    };
    return config[level];
  }

  const availableSkills = STANDARDIZED_SKILLS.filter((s) => !skills.includes(s.id));
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "WP";
  const stats = profileData?.workerProfile?.stats;

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-[var(--nimmit-bg-primary)]">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-[var(--nimmit-text-primary)]">
            Your Profile
          </h1>
          <p className="text-[var(--nimmit-text-secondary)] mt-2">
            Manage your personal information and skills
          </p>
        </div>

        {/* Stats Card (Read-only) */}
        {stats && (
          <Card className="border-[var(--nimmit-accent-primary)]/50 bg-gradient-to-br from-[var(--nimmit-accent-primary)]/5 to-transparent shadow-md animate-fade-up stagger-1">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-display">Performance Stats</CardTitle>
              <CardDescription>Your work history at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center p-4 bg-[var(--nimmit-bg-elevated)] rounded-xl border border-[var(--nimmit-border)]">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-[var(--nimmit-success)]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[var(--nimmit-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-3xl font-display font-bold text-[var(--nimmit-text-primary)]">
                    {stats.completedJobs}
                  </p>
                  <p className="text-sm text-[var(--nimmit-text-tertiary)]">Completed Jobs</p>
                </div>
                <div className="text-center p-4 bg-[var(--nimmit-bg-elevated)] rounded-xl border border-[var(--nimmit-border)]">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  </div>
                  <p className="text-3xl font-display font-bold text-[var(--nimmit-text-primary)]">
                    {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "-"}
                  </p>
                  <p className="text-sm text-[var(--nimmit-text-tertiary)]">Avg Rating</p>
                </div>
                <div className="text-center p-4 bg-[var(--nimmit-bg-elevated)] rounded-xl border border-[var(--nimmit-border)]">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-[var(--nimmit-accent-primary)]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[var(--nimmit-accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-3xl font-display font-bold text-[var(--nimmit-text-primary)]">
                    ${stats.totalEarnings.toLocaleString()}
                  </p>
                  <p className="text-sm text-[var(--nimmit-text-tertiary)]">Total Earnings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personal Info Card */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-display">Personal Information</CardTitle>
            <CardDescription>Your basic profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="w-20 h-20 border-2 border-[var(--nimmit-border)]">
                <AvatarImage src={profileData?.profile.avatar} alt={`${firstName} ${lastName}`} />
                <AvatarFallback className="bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)] text-xl font-display">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-lg font-medium text-[var(--nimmit-text-primary)]">
                  {firstName} {lastName}
                </p>
                <p className="text-sm text-[var(--nimmit-text-secondary)]">{profileData?.email}</p>
                <Button variant="outline" size="sm" className="mt-2 border-[var(--nimmit-border)]">
                  Change Avatar
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-[var(--nimmit-text-secondary)]">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="border-[var(--nimmit-border)] focus-visible:ring-[var(--nimmit-accent-primary)]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-[var(--nimmit-text-secondary)]">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="border-[var(--nimmit-border)] focus-visible:ring-[var(--nimmit-accent-primary)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[var(--nimmit-text-secondary)]">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="border-[var(--nimmit-border)] focus-visible:ring-[var(--nimmit-accent-primary)]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Bio Card */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-3">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-display">Professional Bio</CardTitle>
            <CardDescription>Tell clients about your experience and expertise</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Share your background, experience, and what makes you great at what you do..."
              className="min-h-32 border-[var(--nimmit-border)] focus-visible:ring-[var(--nimmit-accent-primary)]"
            />
            <p className="text-sm text-[var(--nimmit-text-tertiary)] mt-2">
              {bio.length}/500 characters
            </p>
          </CardContent>
        </Card>

        {/* Skills Management Card */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-4">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-display">Skills</CardTitle>
                <CardDescription>Manage your skills and proficiency levels</CardDescription>
              </div>
              {!addingSkill && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingSkill(true)}
                  className="border-[var(--nimmit-border)] hover:bg-[var(--nimmit-bg-secondary)]"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Skill
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Skill Form */}
            {addingSkill && (
              <div className="p-4 rounded-xl border border-[var(--nimmit-accent-primary)]/30 bg-[var(--nimmit-accent-primary)]/5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-1">
                    <Label className="text-[var(--nimmit-text-secondary)] text-sm">Skill</Label>
                    <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                      <SelectTrigger className="border-[var(--nimmit-border)] mt-1">
                        <SelectValue placeholder="Select skill" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(SKILL_CATEGORIES).map((category) => (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-[var(--nimmit-text-tertiary)]">
                              {category}
                            </div>
                            {availableSkills
                              .filter((s) => s.category === category)
                              .map((skill) => (
                                <SelectItem key={skill.id} value={skill.id}>
                                  {skill.label}
                                </SelectItem>
                              ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-1">
                    <Label className="text-[var(--nimmit-text-secondary)] text-sm">Level</Label>
                    <Select value={selectedLevel} onValueChange={(v) => setSelectedLevel(v as SkillLevel)}>
                      <SelectTrigger className="border-[var(--nimmit-border)] mt-1">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="junior">Junior</SelectItem>
                        <SelectItem value="mid">Mid</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-1 flex items-end gap-2">
                    <Button
                      onClick={handleAddSkill}
                      className="flex-1 bg-[var(--nimmit-accent-primary)] hover:bg-[var(--nimmit-accent-primary-hover)]"
                    >
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAddingSkill(false);
                        setSelectedSkill("");
                        setSelectedLevel("mid");
                      }}
                      className="border-[var(--nimmit-border)]"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Skills List */}
            {skills.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[var(--nimmit-bg-secondary)] flex items-center justify-center">
                  <svg className="w-6 h-6 text-[var(--nimmit-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-[var(--nimmit-text-secondary)]">No skills added yet</p>
                <p className="text-sm text-[var(--nimmit-text-tertiary)]">Click &quot;Add Skill&quot; to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {skills.map((skillId) => {
                  const level = skillLevels[skillId] || "mid";
                  const levelConfig = getSkillLevelBadge(level);
                  return (
                    <div
                      key={skillId}
                      className="flex items-center justify-between p-3 rounded-xl border border-[var(--nimmit-border)] bg-[var(--nimmit-bg-elevated)]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-[var(--nimmit-text-primary)]">
                          {getSkillLabel(skillId)}
                        </span>
                        <Badge variant="outline" className={`text-xs ${levelConfig.className}`}>
                          {levelConfig.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={level}
                          onValueChange={(v) => handleUpdateSkillLevel(skillId, v as SkillLevel)}
                        >
                          <SelectTrigger className="w-24 h-8 text-xs border-[var(--nimmit-border)]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="junior">Junior</SelectItem>
                            <SelectItem value="mid">Mid</SelectItem>
                            <SelectItem value="senior">Senior</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSkill(skillId)}
                          className="h-8 w-8 p-0 text-[var(--nimmit-error)] hover:bg-[var(--nimmit-error-bg)]"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Portfolio Links Card */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-5">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-display">Portfolio Links</CardTitle>
            <CardDescription>Share your online portfolio and LinkedIn profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="portfolioUrl" className="text-[var(--nimmit-text-secondary)]">
                Portfolio URL
              </Label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--nimmit-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <Input
                  id="portfolioUrl"
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://yourportfolio.com"
                  className="pl-10 border-[var(--nimmit-border)] focus-visible:ring-[var(--nimmit-accent-primary)]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl" className="text-[var(--nimmit-text-secondary)]">
                LinkedIn URL
              </Label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--nimmit-text-tertiary)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                <Input
                  id="linkedinUrl"
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className="pl-10 border-[var(--nimmit-border)] focus-visible:ring-[var(--nimmit-accent-primary)]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3 animate-fade-up stagger-6">
          <Button
            variant="outline"
            className="border-[var(--nimmit-border)]"
            onClick={() => window.location.reload()}
          >
            Reset Changes
          </Button>
          <Button
            onClick={handleSaveProfile}
            disabled={saving}
            className="bg-[var(--nimmit-accent-primary)] hover:bg-[var(--nimmit-accent-primary-hover)]"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              "Save Profile"
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
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="h-10 w-48 skeleton rounded" />
          <div className="h-5 w-72 skeleton rounded" />
        </div>

        {/* Stats Card */}
        <div className="rounded-xl border border-[var(--nimmit-border)] p-6">
          <div className="space-y-2 mb-4">
            <div className="h-6 w-40 skeleton rounded" />
            <div className="h-4 w-56 skeleton rounded" />
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center p-4 rounded-xl border border-[var(--nimmit-border)]">
                <div className="h-10 w-10 mx-auto mb-2 skeleton rounded-xl" />
                <div className="h-8 w-16 mx-auto skeleton rounded" />
                <div className="h-4 w-24 mx-auto mt-1 skeleton rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Personal Info Card */}
        <div className="rounded-xl border border-[var(--nimmit-border)] p-6 space-y-6">
          <div className="space-y-2">
            <div className="h-6 w-48 skeleton rounded" />
            <div className="h-4 w-40 skeleton rounded" />
          </div>
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 skeleton rounded-full" />
            <div className="space-y-2">
              <div className="h-5 w-32 skeleton rounded" />
              <div className="h-4 w-48 skeleton rounded" />
              <div className="h-8 w-28 skeleton rounded" />
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
        </div>

        {/* Bio Card */}
        <div className="rounded-xl border border-[var(--nimmit-border)] p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-6 w-40 skeleton rounded" />
            <div className="h-4 w-64 skeleton rounded" />
          </div>
          <div className="h-32 skeleton rounded" />
        </div>

        {/* Skills Card */}
        <div className="rounded-xl border border-[var(--nimmit-border)] p-6 space-y-4">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="h-6 w-24 skeleton rounded" />
              <div className="h-4 w-52 skeleton rounded" />
            </div>
            <div className="h-9 w-24 skeleton rounded" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-[var(--nimmit-border)]">
              <div className="flex items-center gap-3">
                <div className="h-5 w-28 skeleton rounded" />
                <div className="h-5 w-16 skeleton rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-24 skeleton rounded" />
                <div className="h-8 w-8 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <div className="h-10 w-32 skeleton rounded" />
          <div className="h-10 w-28 skeleton rounded" />
        </div>
      </div>
    </div>
  );
}
