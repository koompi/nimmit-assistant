"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createJobSchema, type CreateJobInput } from "@/lib/validations/job";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

const categories = [
  { value: "video", label: "Video Editing", icon: "🎬" },
  { value: "design", label: "Graphic Design", icon: "🎨" },
  { value: "web", label: "Web Development", icon: "💻" },
  { value: "social", label: "Social Media", icon: "📱" },
  { value: "admin", label: "Admin Tasks", icon: "📋" },
  { value: "other", label: "Other", icon: "✨" },
];

const priorities = [
  { value: "standard", label: "Standard", time: "48 hours", description: "Regular delivery", color: "accent-primary" },
  { value: "priority", label: "Priority", time: "24 hours", description: "Faster delivery", color: "warning" },
  { value: "rush", label: "Rush", time: "12 hours", description: "Urgent delivery", color: "error" },
];

export default function NewJobPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateJobInput>({
    resolver: zodResolver(createJobSchema),
    defaultValues: { priority: "standard" },
  });

  const selectedCategory = watch("category");
  const selectedPriority = watch("priority");

  const onSubmit = async (data: CreateJobInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error?.message || "Failed to create task");
        return;
      }
      toast.success("Task submitted successfully!");
      router.push(`/client/jobs/${result.data._id}`);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--nimmit-bg-primary)]">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <Link href="/client/jobs" className="inline-flex items-center gap-1 text-sm text-[var(--nimmit-text-secondary)] hover:text-[var(--nimmit-accent-primary)] mb-4 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Jobs
          </Link>
          <h1 className="text-3xl font-display font-semibold tracking-tight text-[var(--nimmit-text-primary)]">
            Request New Task
          </h1>
          <p className="text-[var(--nimmit-text-secondary)] mt-2">
            Tell us what you need done. Be as detailed as possible.
          </p>
        </div>

        {/* Form Card */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <svg className="w-5 h-5 text-[var(--nimmit-accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Task Details
            </CardTitle>
            <CardDescription>Describe your task and we&apos;ll assign it to the best team member.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {error && (
                <Alert className="border-[var(--nimmit-error)]/30 bg-[var(--nimmit-error-bg)]/50">
                  <svg className="w-5 h-5 text-[var(--nimmit-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <AlertDescription className="text-[var(--nimmit-error)]">{error}</AlertDescription>
                </Alert>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[var(--nimmit-text-primary)]">Task Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Edit video for YouTube"
                  className="border-[var(--nimmit-border)] focus:border-[var(--nimmit-accent-primary)]"
                  {...register("title")}
                />
                {errors.title && <p className="text-sm text-[var(--nimmit-error)]">{errors.title.message}</p>}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-[var(--nimmit-text-primary)]">Category</Label>
                <Select value={selectedCategory} onValueChange={(value) => setValue("category", value as CreateJobInput["category"])}>
                  <SelectTrigger className="border-[var(--nimmit-border)]">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)]">
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-[var(--nimmit-error)]">{errors.category.message}</p>}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-[var(--nimmit-text-primary)]">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your task in detail. Include any specific requirements, style preferences, reference links, etc."
                  rows={6}
                  className="border-[var(--nimmit-border)] focus:border-[var(--nimmit-accent-primary)]"
                  {...register("description")}
                />
                {errors.description && <p className="text-sm text-[var(--nimmit-error)]">{errors.description.message}</p>}
                <p className="text-sm text-[var(--nimmit-text-tertiary)]">
                  The more detail you provide, the better we can deliver.
                </p>
              </div>

              {/* Priority */}
              <div className="space-y-3">
                <Label className="text-[var(--nimmit-text-primary)]">Priority</Label>
                <div className="grid gap-3">
                  {priorities.map((p) => {
                    const isSelected = selectedPriority === p.value;
                    return (
                      <label
                        key={p.value}
                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200 ${isSelected
                            ? `border-[var(--nimmit-${p.color})]/50 bg-[var(--nimmit-${p.color})]/5 ring-1 ring-[var(--nimmit-${p.color})]/20`
                            : "border-[var(--nimmit-border)] bg-[var(--nimmit-bg-elevated)] hover:border-[var(--nimmit-accent-primary)]/30"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? `bg-[var(--nimmit-${p.color})]/10` : "bg-[var(--nimmit-bg-secondary)]"
                            }`}>
                            <svg className={`w-5 h-5 ${isSelected ? `text-[var(--nimmit-${p.color})]` : "text-[var(--nimmit-text-tertiary)]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className={`font-medium ${isSelected ? `text-[var(--nimmit-${p.color})]` : "text-[var(--nimmit-text-primary)]"}`}>
                              {p.label} <span className="text-sm font-normal">({p.time})</span>
                            </p>
                            <p className="text-sm text-[var(--nimmit-text-tertiary)]">{p.description}</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? `border-[var(--nimmit-${p.color})] bg-[var(--nimmit-${p.color})]` : "border-[var(--nimmit-border)]"
                          }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <input
                          type="radio"
                          value={p.value}
                          checked={isSelected}
                          onChange={() => setValue("priority", p.value as CreateJobInput["priority"])}
                          className="sr-only"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t border-[var(--nimmit-border)]">
                <Button type="button" variant="outline" onClick={() => router.back()} className="border-[var(--nimmit-border)]">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--nimmit-accent-primary)] hover:bg-[var(--nimmit-accent-primary-hover)]">
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Submit Task
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>

        {/* Tip */}
        <div className="mt-6 p-4 rounded-xl bg-[var(--nimmit-info-bg)]/30 border border-[var(--nimmit-info)]/20 animate-fade-up stagger-2">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[var(--nimmit-info)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-[var(--nimmit-info)] text-sm">Pro tip</p>
              <p className="text-sm text-[var(--nimmit-text-secondary)]">
                Include reference links, examples, or brand guidelines to help us deliver exactly what you need.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
