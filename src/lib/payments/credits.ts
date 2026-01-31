/**
 * Credit System for Nimmit
 *
 * Credits are deducted when jobs are created.
 * Cost varies by category and priority.
 */

// ===========================================
// Credit Costs
// ===========================================

/**
 * Base credit cost per job category
 */
export const CATEGORY_CREDITS: Record<string, number> = {
  video: 3,      // Video editing - high effort
  design: 2,     // Design work - medium-high effort
  web: 2,        // Web updates - medium effort
  social: 1,     // Social media - lower effort
  admin: 1,      // Admin tasks - lower effort
  other: 2,      // Default to medium
};

/**
 * Priority multipliers
 */
export const PRIORITY_MULTIPLIERS: Record<string, number> = {
  standard: 1.0,   // Normal delivery (48h)
  priority: 1.5,   // Priority delivery (24h)
  rush: 2.0,       // Rush delivery (12h)
};

// ===========================================
// Credit Calculation
// ===========================================

export interface CreditCost {
  base: number;
  multiplier: number;
  total: number;
  breakdown: string;
}

/**
 * Calculate credit cost for a job
 */
export function calculateJobCost(
  category: string,
  priority: string
): CreditCost {
  const base = CATEGORY_CREDITS[category] || CATEGORY_CREDITS.other;
  const multiplier = PRIORITY_MULTIPLIERS[priority] || PRIORITY_MULTIPLIERS.standard;
  const total = Math.ceil(base * multiplier);

  return {
    base,
    multiplier,
    total,
    breakdown: `${base} credits (${category}) × ${multiplier} (${priority}) = ${total} credits`,
  };
}

// ===========================================
// Credit Operations
// ===========================================

export interface CreditCheckResult {
  hasEnough: boolean;
  available: number;
  required: number;
  shortfall: number;
}

/**
 * Check if user has enough credits
 */
export function checkCredits(
  available: number,
  required: number
): CreditCheckResult {
  const shortfall = Math.max(0, required - available);
  return {
    hasEnough: available >= required,
    available,
    required,
    shortfall,
  };
}

// ===========================================
// Worker Earnings
// ===========================================

/**
 * Worker payout percentage (platform keeps the rest)
 */
export const WORKER_PAYOUT_PERCENTAGE = 0.70; // 70% to worker

/**
 * Credit to USD conversion for worker payouts
 */
export const CREDIT_TO_USD = 10; // $10 per credit

/**
 * Calculate worker earnings for a job
 */
export function calculateWorkerEarnings(creditsCharged: number): number {
  const grossEarnings = creditsCharged * CREDIT_TO_USD;
  return grossEarnings * WORKER_PAYOUT_PERCENTAGE;
}
