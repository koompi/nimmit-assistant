"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  invoices?: { id: string; date: string; amount: number; status: string; url: string }[];
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-display font-semibold text-[var(--nimmit-text-primary)]">
          Billing & Subscription
        </h1>
        <p className="text-sm text-[var(--nimmit-text-tertiary)]">Manage your plan and invoices</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Current Plan Overview (Compact) */}
        <Card className="md:col-span-2 border-[var(--nimmit-border)] shadow-sm">
          <CardHeader className="py-4 border-b border-[var(--nimmit-border)]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Active Plan</CardTitle>
              {hasActiveSubscription ? (
                <Badge className="bg-[var(--nimmit-success)]/10 text-[var(--nimmit-success)] border-[var(--nimmit-success)]/20">Active</Badge>
              ) : (
                <Badge variant="outline" className="text-[var(--nimmit-text-tertiary)]">Free Tier</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="py-4">
            {hasActiveSubscription && billing ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-display font-bold capitalize text-[var(--nimmit-text-primary)] mb-1">
                    {billing.subscriptionTier}
                  </p>
                  <p className="text-sm text-[var(--nimmit-text-tertiary)]">
                    Renews {new Date(billing.billingPeriodEnd!).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-display font-bold text-[var(--nimmit-accent-primary)]">{billing.credits}</p>
                  <p className="text-xs text-[var(--nimmit-text-tertiary)] uppercase font-semibold">Credits</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-[var(--nimmit-text-secondary)] mb-4">You are currently on the free plan.</p>
                <Button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
                  Upgrade Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions / Contact */}
        <Card className="border-[var(--nimmit-border)] shadow-sm flex flex-col justify-center items-center text-center p-6">
          <div className="w-10 h-10 rounded-full bg-[var(--nimmit-bg-secondary)] flex items-center justify-center mb-3">
            <span className="text-lg">💬</span>
          </div>
          <h3 className="text-sm font-semibold mb-1">Need Enterprise?</h3>
          <p className="text-xs text-[var(--nimmit-text-tertiary)] mb-4">Contact us for custom volumes</p>
          <Button variant="outline" size="sm" className="w-full">Contact Sales</Button>
        </Card>
      </div>

      {/* Billing History (Dense Table) */}
      <div className="bg-[var(--nimmit-bg-elevated)] rounded-lg border border-[var(--nimmit-border)]">
        <div className="px-4 py-3 border-b border-[var(--nimmit-border)] bg-[var(--nimmit-bg-secondary)]/30">
          <h3 className="text-xs font-semibold text-[var(--nimmit-text-secondary)] uppercase tracking-wider">Billing History</h3>
        </div>
        <div className="divide-y divide-[var(--nimmit-border)]">
          {/* Placeholder for no invoices, or map invoices if they existed in type */}
          {(!billing?.invoices || billing.invoices.length === 0) ? (
            <div className="px-4 py-6 text-center text-xs text-[var(--nimmit-text-tertiary)]">
              No invoices found
            </div>
          ) : (
            billing.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--nimmit-bg-secondary)] transition-colors">
                <div>
                  <div className="text-sm font-medium text-[var(--nimmit-text-primary)]">{new Date(inv.date).toLocaleDateString()}</div>
                  <div className="text-xs text-[var(--nimmit-text-tertiary)]">Invoice #{inv.id}</div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="font-normal text-xs">{inv.status}</Badge>
                  <span className="text-sm font-mono font-medium">${inv.amount.toFixed(2)}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <span className="sr-only">Download</span>
                    ⬇️
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pricing Section (id="pricing") */}
      <div id="pricing" className="pt-6">
        <h2 className="text-lg font-semibold mb-4 text-[var(--nimmit-text-primary)]">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {tiers.map((tier) => {
            const isCurrent = billing?.subscriptionTier === tier.id;
            return (
              <Card key={tier.id} className={`border-[var(--nimmit-border)] overflow-hidden ${isCurrent ? 'ring-1 ring-[var(--nimmit-accent-primary)] border-[var(--nimmit-accent-primary)]' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-display font-semibold text-lg">{tier.name}</h3>
                    {isCurrent && <Badge className="bg-[var(--nimmit-success)]/10 text-[var(--nimmit-success)]">Current</Badge>}
                  </div>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-bold font-display">${tier.price}</span>
                    <span className="text-xs text-[var(--nimmit-text-tertiary)]">/mo</span>
                  </div>

                  <div className="bg-[var(--nimmit-bg-secondary)] rounded p-2 mb-4 text-center">
                    <span className="font-bold text-[var(--nimmit-accent-primary)]">{tier.credits}</span>
                    <span className="text-xs text-[var(--nimmit-text-tertiary)] ml-1">credits</span>
                  </div>

                  <ul className="space-y-2 mb-4">
                    {tier.features.map(f => (
                      <li key={f} className="text-xs text-[var(--nimmit-text-secondary)] flex gap-2">
                        <span className="text-[var(--nimmit-success)]">✓</span> {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    size="sm"
                    className="w-full"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || subscribing !== null}
                    onClick={() => subscribe(tier.id)}
                  >
                    {subscribing === tier.id ? "Processing..." : isCurrent ? "Active" : "Subscribe"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return <div className="p-8 animate-pulse">Loading billing info...</div>;
}

export default function BillingPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <BillingPageContent />
    </Suspense>
  );
}
