"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  credits: number;
  rollover: number;
  features: string[];
}

interface BillingInfo {
  subscriptionTier?: string;
  subscriptionStatus?: string;
  credits: number;
  rolloverCredits: number;
  billingPeriodEnd?: string;
}

function BillingPageContent() {
  const searchParams = useSearchParams();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("success") === "true") toast.success("Subscription activated successfully!");
    else if (searchParams.get("canceled") === "true") toast.info("Subscription canceled");
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      fetch("/api/payments/subscribe").then(r => r.json()).then(d => d.success && setTiers(d.data.tiers)),
      fetch("/api/users/me/billing").then(r => r.json()).then(d => d.success && setBilling(d.data)),
    ]).finally(() => setLoading(false));
  }, []);

  async function subscribe(tierId: string) {
    setSubscribing(tierId);
    try {
      const response = await fetch("/api/payments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId }),
      });
      const data = await response.json();
      if (data.success && data.data.url) window.location.href = data.data.url;
      else toast.error(data.error?.message || "Failed to start subscription");
    } catch {
      toast.error("Failed to start subscription");
    } finally {
      setSubscribing(null);
    }
  }

  if (loading) return <LoadingSkeleton />;

  const hasActiveSubscription = billing?.subscriptionStatus === "active";

  return (
    <div className="min-h-screen bg-[var(--nimmit-bg-primary)]">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-[var(--nimmit-text-primary)]">
            Billing & Subscription
          </h1>
          <p className="text-[var(--nimmit-text-secondary)] mt-2">Manage your subscription and credits</p>
        </div>

        {/* Current Plan Card */}
        {hasActiveSubscription && billing && (
          <Card className="border-[var(--nimmit-accent-primary)]/50 bg-gradient-to-br from-[var(--nimmit-accent-primary)]/5 to-transparent shadow-md animate-fade-up stagger-1">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-display">Current Plan</CardTitle>
                  <CardDescription>Your active subscription</CardDescription>
                </div>
                <Badge className="bg-[var(--nimmit-success-bg)] text-[var(--nimmit-success)] border-[var(--nimmit-success)]/20">
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--nimmit-accent-primary)]/10 flex items-center justify-center">
                    <svg className="w-7 h-7 text-[var(--nimmit-accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-display font-semibold capitalize text-[var(--nimmit-text-primary)]">
                      {billing.subscriptionTier} Plan
                    </p>
                    {billing.billingPeriodEnd && (
                      <p className="text-sm text-[var(--nimmit-text-tertiary)]">
                        Renews {new Date(billing.billingPeriodEnd).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-center md:text-right p-4 bg-[var(--nimmit-bg-elevated)] rounded-xl border border-[var(--nimmit-border)]">
                  <p className="text-4xl font-display font-bold text-[var(--nimmit-accent-primary)]">{billing.credits}</p>
                  <p className="text-sm text-[var(--nimmit-text-tertiary)]">credits remaining</p>
                  {billing.rolloverCredits > 0 && (
                    <p className="text-xs text-[var(--nimmit-text-tertiary)] mt-1">
                      (includes {billing.rolloverCredits} rollover)
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Subscription Alert */}
        {!hasActiveSubscription && (
          <Alert className="border-[var(--nimmit-info)]/30 bg-[var(--nimmit-info-bg)]/50 animate-fade-up stagger-1">
            <svg className="w-5 h-5 text-[var(--nimmit-info)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <AlertDescription className="text-[var(--nimmit-info)]">
              You don&apos;t have an active subscription. Choose a plan below to get started.
            </AlertDescription>
          </Alert>
        )}

        {/* Pricing Section */}
        <div className="animate-fade-up stagger-2">
          <h2 className="text-xl font-display font-semibold text-[var(--nimmit-text-primary)] mb-6">
            {hasActiveSubscription ? "Upgrade Your Plan" : "Choose a Plan"}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {tiers.map((tier, index) => {
              const isCurrentPlan = billing?.subscriptionTier === tier.id;
              const isPopular = tier.id === "professional";

              return (
                <Card
                  key={tier.id}
                  className={`relative border-[var(--nimmit-border)] shadow-sm hover:shadow-lg transition-all duration-300 ${isCurrentPlan ? "border-[var(--nimmit-accent-primary)] ring-2 ring-[var(--nimmit-accent-primary)]/20" : ""
                    } ${isPopular ? "md:-translate-y-2" : ""}`}
                  style={{ animationDelay: `${(index + 3) * 100}ms` }}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-[var(--nimmit-accent-primary)] text-white">Most Popular</Badge>
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-4">
                      <Badge className="bg-[var(--nimmit-success-bg)] text-[var(--nimmit-success)]">Current</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-4 pt-6">
                    <CardTitle className="text-xl font-display">{tier.name}</CardTitle>
                    <CardDescription>
                      <span className="text-3xl font-display font-bold text-[var(--nimmit-text-primary)]">${tier.price}</span>
                      <span className="text-[var(--nimmit-text-tertiary)]">/month</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Credits Badge */}
                    <div className="text-center py-3 bg-[var(--nimmit-bg-secondary)] rounded-xl">
                      <p className="text-3xl font-display font-bold text-[var(--nimmit-accent-primary)]">{tier.credits}</p>
                      <p className="text-sm text-[var(--nimmit-text-tertiary)]">credits/month</p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="text-sm flex items-start gap-2 text-[var(--nimmit-text-primary)]">
                          <svg className="w-5 h-5 text-[var(--nimmit-success)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Button
                      className={`w-full ${isCurrentPlan
                          ? "bg-transparent border-[var(--nimmit-border)] text-[var(--nimmit-text-tertiary)]"
                          : "bg-[var(--nimmit-accent-primary)] hover:bg-[var(--nimmit-accent-primary-hover)]"
                        }`}
                      variant={isCurrentPlan ? "outline" : "default"}
                      disabled={isCurrentPlan || subscribing !== null}
                      onClick={() => subscribe(tier.id)}
                    >
                      {subscribing === tier.id ? "Loading..." : isCurrentPlan ? "Current Plan" : hasActiveSubscription ? "Upgrade" : "Subscribe"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Help Section */}
        <Card className="border-[var(--nimmit-border)] shadow-sm animate-fade-up stagger-6">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--nimmit-accent-tertiary)]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--nimmit-accent-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-[var(--nimmit-text-primary)]">Need help choosing?</p>
                <p className="text-sm text-[var(--nimmit-text-tertiary)]">Contact our team for personalized recommendations</p>
              </div>
            </div>
            <Button variant="outline" className="border-[var(--nimmit-border)]">Contact Support</Button>
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
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div className="space-y-4">
          <div className="h-10 w-64 skeleton rounded" />
          <div className="h-5 w-48 skeleton rounded" />
        </div>
        <div className="rounded-xl border border-[var(--nimmit-border)] p-6">
          <div className="flex justify-between">
            <div className="space-y-2"><div className="h-6 w-32 skeleton rounded" /><div className="h-4 w-24 skeleton rounded" /></div>
            <div className="h-16 w-24 skeleton rounded" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-[var(--nimmit-border)] p-6 space-y-4">
              <div className="h-6 w-24 skeleton rounded" />
              <div className="h-8 w-20 skeleton rounded" />
              <div className="h-16 skeleton rounded" />
              <div className="space-y-2">{[1, 2, 3].map((j) => <div key={j} className="h-4 skeleton rounded" />)}</div>
              <div className="h-10 skeleton rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <BillingPageContent />
    </Suspense>
  );
}
