import type { JobStatus } from "@/types";

// ===========================================
// Valid Status Transitions
// ===========================================

/**
 * Map of valid status transitions
 * Key: current status
 * Value: array of valid next statuses
 */
export const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  pending: ["assigned", "cancelled"],
  assigned: ["in_progress", "cancelled"],
  in_progress: ["review", "cancelled"],
  review: ["completed", "revision"],
  revision: ["in_progress", "cancelled"],
  completed: [], // Terminal state - no transitions allowed
  cancelled: [], // Terminal state - no transitions allowed
};

// ===========================================
// Transition Validation
// ===========================================

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a status transition is valid
 */
export function isValidTransition(
  currentStatus: JobStatus,
  newStatus: JobStatus
): TransitionResult {
  // Same status is always allowed (no-op)
  if (currentStatus === newStatus) {
    return { allowed: true };
  }

  const validNextStatuses = VALID_TRANSITIONS[currentStatus];

  if (!validNextStatuses) {
    return {
      allowed: false,
      reason: `Unknown current status: ${currentStatus}`,
    };
  }

  if (validNextStatuses.length === 0) {
    return {
      allowed: false,
      reason: `${currentStatus} is a terminal status and cannot be changed`,
    };
  }

  if (!validNextStatuses.includes(newStatus)) {
    return {
      allowed: false,
      reason: `Cannot transition from ${currentStatus} to ${newStatus}. Valid transitions: ${validNextStatuses.join(", ")}`,
    };
  }

  return { allowed: true };
}

// ===========================================
// Role-Based Transition Permissions
// ===========================================

/**
 * Map of which roles can trigger which transitions
 */
export const TRANSITION_PERMISSIONS: Record<
  string, // transition key: "from:to"
  ("client" | "worker" | "admin")[]
> = {
  // Client transitions
  "review:completed": ["client"],
  "review:revision": ["client"],

  // Worker transitions
  "assigned:in_progress": ["worker", "admin"],
  "in_progress:review": ["worker", "admin"],
  "revision:in_progress": ["worker", "admin"],

  // Admin transitions
  "pending:assigned": ["admin"],
  "pending:cancelled": ["client", "admin"],
  "assigned:cancelled": ["client", "admin"],
  "in_progress:cancelled": ["admin"], // Only admin can cancel in-progress
  "revision:cancelled": ["admin"],
};

/**
 * Check if a role can perform a transition
 */
export function canPerformTransition(
  currentStatus: JobStatus,
  newStatus: JobStatus,
  role: "client" | "worker" | "admin"
): TransitionResult {
  // First check if transition is valid
  const validationResult = isValidTransition(currentStatus, newStatus);
  if (!validationResult.allowed) {
    return validationResult;
  }

  // Same status is always allowed
  if (currentStatus === newStatus) {
    return { allowed: true };
  }

  // Check role permission
  const transitionKey = `${currentStatus}:${newStatus}`;
  const allowedRoles = TRANSITION_PERMISSIONS[transitionKey];

  if (!allowedRoles) {
    // If not explicitly defined, only admin can do it
    if (role === "admin") {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Only admins can perform this transition`,
    };
  }

  if (!allowedRoles.includes(role)) {
    return {
      allowed: false,
      reason: `${role} is not allowed to transition from ${currentStatus} to ${newStatus}`,
    };
  }

  return { allowed: true };
}

// ===========================================
// Transition Side Effects
// ===========================================

/**
 * Define what should happen when a transition occurs
 */
export interface TransitionSideEffects {
  updateTimestamp?: "assignedAt" | "startedAt" | "completedAt";
  notifyClient?: boolean;
  notifyWorker?: boolean;
  notifyAdmin?: boolean;
  calculateEarnings?: boolean;
}

export const TRANSITION_SIDE_EFFECTS: Record<string, TransitionSideEffects> = {
  "pending:assigned": {
    updateTimestamp: "assignedAt",
    notifyWorker: true,
  },
  "assigned:in_progress": {
    updateTimestamp: "startedAt",
    notifyClient: true,
  },
  "in_progress:review": {
    notifyClient: true,
  },
  "review:completed": {
    updateTimestamp: "completedAt",
    notifyWorker: true,
    calculateEarnings: true,
  },
  "review:revision": {
    notifyWorker: true,
  },
  "revision:in_progress": {
    notifyClient: true,
  },
  "pending:cancelled": {
    // Refund credits if charged
  },
  "assigned:cancelled": {
    notifyWorker: true,
  },
  "in_progress:cancelled": {
    notifyWorker: true,
    notifyClient: true,
  },
};

/**
 * Get side effects for a transition
 */
export function getTransitionSideEffects(
  currentStatus: JobStatus,
  newStatus: JobStatus
): TransitionSideEffects {
  return TRANSITION_SIDE_EFFECTS[`${currentStatus}:${newStatus}`] || {};
}
