import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeInstance;
}

// ===========================================
// Subscription Tiers
// ===========================================

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  credits: number;
  rollover: number;
  features: string[];
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 499,
    credits: 10,
    rollover: 2,
    features: [
      "10 task credits/month",
      "Up to 2 rollover credits",
      "48-hour delivery",
      "Email support",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth",
    price: 999,
    credits: 25,
    rollover: 3,
    features: [
      "25 task credits/month",
      "Up to 3 rollover credits",
      "24-hour delivery option",
      "Priority support",
      "Dedicated account manager",
    ],
  },
  scale: {
    id: "scale",
    name: "Scale",
    price: 1999,
    credits: 60,
    rollover: 6,
    features: [
      "60 task credits/month",
      "Up to 6 rollover credits",
      "Rush delivery (12h) included",
      "Priority queue placement",
      "Dedicated team",
      "Custom workflows",
    ],
  },
};

// ===========================================
// Checkout
// ===========================================

export interface CreateCheckoutParams {
  tierId: string;
  customerId?: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripe();
  const tier = SUBSCRIPTION_TIERS[params.tierId];

  if (!tier) {
    throw new Error(`Invalid tier: ${params.tierId}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: params.customerId,
    customer_email: params.customerId ? undefined : params.customerEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Nimmit ${tier.name} Plan`,
            description: `${tier.credits} task credits per month`,
          },
          unit_amount: tier.price * 100,
          recurring: {
            interval: "month",
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      tierId: params.tierId,
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  return {
    sessionId: session.id,
    url: session.url!,
  };
}

// ===========================================
// Customer Portal
// ===========================================

export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

// ===========================================
// Customer Management
// ===========================================

export async function createCustomer(
  email: string,
  name: string,
  metadata?: Record<string, string>
): Promise<string> {
  const stripe = getStripe();

  const customer = await stripe.customers.create({
    email,
    name,
    metadata,
  });

  return customer.id;
}

export async function getCustomer(customerId: string): Promise<Stripe.Customer | null> {
  const stripe = getStripe();

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;
    return customer as Stripe.Customer;
  } catch {
    return null;
  }
}

// ===========================================
// Subscription Management
// ===========================================

export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  const stripe = getStripe();

  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch {
    return null;
  }
}

export async function cancelSubscription(
  subscriptionId: string,
  immediately = false
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  if (immediately) {
    return await stripe.subscriptions.cancel(subscriptionId);
  }

  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

// ===========================================
// Webhook Handling
// ===========================================

export async function constructWebhookEvent(
  payload: string,
  signature: string
): Promise<Stripe.Event> {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

// ===========================================
// Stripe Connect - Worker Payouts
// ===========================================

export interface ConnectAccountStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements?: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
  };
}

/**
 * Create a Stripe Connect Express account for a worker
 */
export async function createConnectAccount(
  email: string,
  metadata?: Record<string, string>
): Promise<string> {
  const stripe = getStripe();

  const account = await stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      transfers: { requested: true },
    },
    metadata,
  });

  return account.id;
}

/**
 * Create an onboarding link for a worker to complete their Connect account setup
 */
export async function createConnectOnboardingLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripe();

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return accountLink.url;
}

/**
 * Create a login link for a worker to access their Stripe Express dashboard
 */
export async function createConnectLoginLink(accountId: string): Promise<string> {
  const stripe = getStripe();

  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink.url;
}

/**
 * Get the status of a Connect account
 */
export async function getConnectAccountStatus(
  accountId: string
): Promise<ConnectAccountStatus | null> {
  const stripe = getStripe();

  try {
    const account = await stripe.accounts.retrieve(accountId);

    return {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: account.requirements ? {
        currentlyDue: account.requirements.currently_due || [],
        eventuallyDue: account.requirements.eventually_due || [],
        pastDue: account.requirements.past_due || [],
      } : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Transfer funds to a worker's Connect account
 */
export async function createTransfer(
  amount: number, // Amount in cents
  destinationAccountId: string,
  metadata?: Record<string, string>
): Promise<{ transferId: string; amount: number }> {
  const stripe = getStripe();

  const transfer = await stripe.transfers.create({
    amount,
    currency: 'usd',
    destination: destinationAccountId,
    metadata,
  });

  return {
    transferId: transfer.id,
    amount: transfer.amount,
  };
}

/**
 * Create a payout from Nimmit's platform account to a worker
 * This is the main function used for paying workers
 */
export async function payWorker(
  workerConnectAccountId: string,
  amountCents: number,
  jobId: string,
  jobTitle: string
): Promise<{ transferId: string; amount: number }> {
  return createTransfer(amountCents, workerConnectAccountId, {
    jobId,
    jobTitle,
    type: 'worker_payout',
  });
}

/**
 * Get transfer history for a worker
 */
export async function getWorkerTransfers(
  destinationAccountId: string,
  limit = 10
): Promise<Stripe.Transfer[]> {
  const stripe = getStripe();

  const transfers = await stripe.transfers.list({
    destination: destinationAccountId,
    limit,
  });

  return transfers.data;
}

/**
 * Get the platform's available balance
 */
export async function getPlatformBalance(): Promise<{
  available: number;
  pending: number;
}> {
  const stripe = getStripe();

  const balance = await stripe.balance.retrieve();

  const availableUsd = balance.available.find(b => b.currency === 'usd');
  const pendingUsd = balance.pending.find(b => b.currency === 'usd');

  return {
    available: availableUsd?.amount || 0,
    pending: pendingUsd?.amount || 0,
  };
}

/**
 * Retrieve a transfer by ID
 */
export async function getTransfer(transferId: string): Promise<Stripe.Transfer | null> {
  const stripe = getStripe();

  try {
    return await stripe.transfers.retrieve(transferId);
  } catch {
    return null;
  }
}

export { getStripe };
