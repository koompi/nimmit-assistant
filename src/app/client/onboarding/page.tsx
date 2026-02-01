"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STEPS = [
  { id: 1, title: "About You", description: "Tell us about your business" },
  { id: 2, title: "Your Needs", description: "What tasks do you need help with?" },
  { id: 3, title: "Get Started", description: "You're all set!" },
];

const INDUSTRIES = [
  "Technology",
  "E-commerce",
  "Marketing Agency",
  "Healthcare",
  "Finance",
  "Real Estate",
  "Education",
  "Media & Entertainment",
  "Consulting",
  "Non-profit",
  "Other",
];

const TASK_TYPES = [
  { id: "video", label: "Video Editing", icon: "🎬" },
  { id: "design", label: "Graphic Design", icon: "🎨" },
  { id: "web", label: "Web Development", icon: "💻" },
  { id: "social", label: "Social Media", icon: "📱" },
  { id: "admin", label: "Admin Tasks", icon: "📋" },
  { id: "other", label: "Other Tasks", icon: "✨" },
];

const COMPANY_SIZES = [
  { value: "solo", label: "Just me" },
  { value: "2-10", label: "2-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "200+", label: "200+ employees" },
];

const REFERRAL_SOURCES = [
  "Google Search",
  "Social Media",
  "Friend or Colleague",
  "Blog or Article",
  "Podcast",
  "Other",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    companyName: "",
    companySize: "",
    industry: "",
    primaryTaskTypes: [] as string[],
    howDidYouHear: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const firstName = session?.user?.name?.split(" ")[0] || "there";

  const handleTaskTypeToggle = (taskId: string) => {
    setFormData((prev) => ({
      ...prev,
      primaryTaskTypes: prev.primaryTaskTypes.includes(taskId)
        ? prev.primaryTaskTypes.filter((t) => t !== taskId)
        : [...prev.primaryTaskTypes, taskId],
    }));
  };

  const handleNext = () => {
    setError(null);

    // Validation
    if (step === 1) {
      if (!formData.companySize) {
        setError("Please select your company size");
        return;
      }
      if (!formData.industry) {
        setError("Please select your industry");
        return;
      }
    }

    if (step === 2) {
      if (formData.primaryTaskTypes.length === 0) {
        setError("Please select at least one task type");
        return;
      }
    }

    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || "Failed to complete onboarding");
        return;
      }

      // Redirect to dashboard
      router.push("/client/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Progress Bar */}
      <div className="w-full bg-[var(--nimmit-bg-secondary)] border-b border-[var(--nimmit-border)]">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, index) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                    ${
                      step >= s.id
                        ? "bg-[var(--nimmit-accent-primary)] text-white"
                        : "bg-[var(--nimmit-bg-tertiary)] text-[var(--nimmit-text-tertiary)]"
                    }`}
                >
                  {step > s.id ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s.id
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-24 h-0.5 mx-2 transition-colors ${
                      step > s.id ? "bg-[var(--nimmit-accent-primary)]" : "bg-[var(--nimmit-border)]"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-[var(--nimmit-text-secondary)]">
            {STEPS.map((s) => (
              <span key={s.id} className={step === s.id ? "text-[var(--nimmit-text-primary)] font-medium" : ""}>
                {s.title}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl animate-scale-in shadow-lg border-[var(--nimmit-border)]">
          {/* Step 1: About You */}
          {step === 1 && (
            <>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-display tracking-tight">
                  Welcome, {firstName}!
                </CardTitle>
                <CardDescription className="text-[var(--nimmit-text-secondary)]">
                  Let&apos;s personalize your experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                {error && (
                  <div className="rounded-lg bg-[var(--nimmit-error-bg)] border border-[var(--nimmit-error)]/20 p-4">
                    <p className="text-sm text-[var(--nimmit-error)]">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name (optional)</Label>
                  <Input
                    id="companyName"
                    placeholder="Your company name"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Company Size *</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {COMPANY_SIZES.map((size) => (
                      <button
                        key={size.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, companySize: size.value })}
                        className={`p-4 rounded-xl border-2 text-left transition-all
                          ${
                            formData.companySize === size.value
                              ? "border-[var(--nimmit-accent-primary)] bg-[var(--nimmit-accent-primary)]/5"
                              : "border-[var(--nimmit-border)] hover:border-[var(--nimmit-border-hover)]"
                          }`}
                      >
                        <span className="text-sm font-medium text-[var(--nimmit-text-primary)]">
                          {size.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry *</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => setFormData({ ...formData, industry: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleNext} size="lg" className="px-8">
                    Continue
                    <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2: Your Needs */}
          {step === 2 && (
            <>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-display tracking-tight">
                  What do you need help with?
                </CardTitle>
                <CardDescription className="text-[var(--nimmit-text-secondary)]">
                  Select all that apply - we&apos;ll match you with the right experts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                {error && (
                  <div className="rounded-lg bg-[var(--nimmit-error-bg)] border border-[var(--nimmit-error)]/20 p-4">
                    <p className="text-sm text-[var(--nimmit-error)]">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {TASK_TYPES.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => handleTaskTypeToggle(task.id)}
                      className={`p-6 rounded-xl border-2 text-center transition-all
                        ${
                          formData.primaryTaskTypes.includes(task.id)
                            ? "border-[var(--nimmit-accent-primary)] bg-[var(--nimmit-accent-primary)]/5"
                            : "border-[var(--nimmit-border)] hover:border-[var(--nimmit-border-hover)]"
                        }`}
                    >
                      <div className="text-3xl mb-2">{task.icon}</div>
                      <span className="text-sm font-medium text-[var(--nimmit-text-primary)]">
                        {task.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="howDidYouHear">How did you hear about us?</Label>
                  <Select
                    value={formData.howDidYouHear}
                    onValueChange={(value) => setFormData({ ...formData, howDidYouHear: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select an option (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {REFERRAL_SOURCES.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="ghost" onClick={handleBack} size="lg">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </Button>
                  <Button onClick={handleNext} size="lg" className="px-8">
                    Continue
                    <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3: Get Started */}
          {step === 3 && (
            <>
              <CardHeader className="text-center pb-2">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--nimmit-success)]/10 flex items-center justify-center">
                  <svg className="w-10 h-10 text-[var(--nimmit-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <CardTitle className="text-2xl font-display tracking-tight">
                  You&apos;re all set, {firstName}!
                </CardTitle>
                <CardDescription className="text-[var(--nimmit-text-secondary)]">
                  Here&apos;s how Nimmit works
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                {error && (
                  <div className="rounded-lg bg-[var(--nimmit-error-bg)] border border-[var(--nimmit-error)]/20 p-4">
                    <p className="text-sm text-[var(--nimmit-error)]">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex gap-4 p-4 rounded-xl bg-[var(--nimmit-bg-secondary)]">
                    <div className="w-10 h-10 rounded-full bg-[var(--nimmit-accent-primary)]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[var(--nimmit-accent-primary)] font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[var(--nimmit-text-primary)]">Submit your task</h4>
                      <p className="text-sm text-[var(--nimmit-text-secondary)]">
                        Describe what you need done. Add files, references, and any details.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 rounded-xl bg-[var(--nimmit-bg-secondary)]">
                    <div className="w-10 h-10 rounded-full bg-[var(--nimmit-accent-primary)]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[var(--nimmit-accent-primary)] font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[var(--nimmit-text-primary)]">We work overnight</h4>
                      <p className="text-sm text-[var(--nimmit-text-secondary)]">
                        Our Cambodia-based team starts working while you sleep (US time).
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 rounded-xl bg-[var(--nimmit-bg-secondary)]">
                    <div className="w-10 h-10 rounded-full bg-[var(--nimmit-accent-primary)]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[var(--nimmit-accent-primary)] font-bold">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[var(--nimmit-text-primary)]">Wake up to results</h4>
                      <p className="text-sm text-[var(--nimmit-text-secondary)]">
                        Review the completed work, request revisions, or approve it.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="ghost" onClick={handleBack} size="lg">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </Button>
                  <Button onClick={handleComplete} size="lg" className="px-8" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      <>
                        Go to Dashboard
                        <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
