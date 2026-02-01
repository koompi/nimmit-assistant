import type { Types } from "mongoose";

// ===========================================
// User Types
// ===========================================

export type UserRole = "client" | "worker" | "admin";

export type WorkerAvailability = "available" | "busy" | "offline";

export type SkillLevel = "junior" | "mid" | "senior";

export interface WorkerStats {
  completedJobs: number;
  avgRating: number;
  totalEarnings: number;
}

export type StripeConnectStatus = "pending" | "active" | "restricted" | "disabled";

export interface WorkerProfile {
  skills: string[];
  skillLevels: Record<string, SkillLevel>;
  availability: WorkerAvailability;
  currentJobCount: number;
  maxConcurrentJobs: number;
  stats: WorkerStats;
  bio?: string;
  // Stripe Connect for payouts
  stripeConnectAccountId?: string;
  stripeConnectStatus?: StripeConnectStatus;
  pendingEarnings?: number;
}

export type SubscriptionTier = "starter" | "growth" | "scale";

export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing";

export interface ClientBilling {
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionTier?: SubscriptionTier;
  subscriptionStatus?: SubscriptionStatus;
  credits: number;
  rolloverCredits: number;
  billingPeriodStart?: Date;
  billingPeriodEnd?: Date;
}

export type CompanySize = "solo" | "2-10" | "11-50" | "51-200" | "200+";

export interface OnboardingData {
  companySize?: CompanySize;
  industry?: string;
  primaryTaskTypes?: string[];
  howDidYouHear?: string;
  completedAt?: Date;
}

export interface ClientProfile {
  company?: string;
  preferredWorkerId?: Types.ObjectId;
  totalJobs: number;
  totalSpent: number;
  billing?: ClientBilling;
  onboardingCompleted?: boolean;
  onboarding?: OnboardingData;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  avatar?: string;
  timezone: string;
  phone?: string;
}

export interface User {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: UserRole;
  profile: UserProfile;
  workerProfile?: WorkerProfile;
  clientProfile?: ClientProfile;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// Job Types
// ===========================================

export type JobStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "review"
  | "revision"
  | "completed"
  | "cancelled";

export type JobCategory =
  | "video"
  | "design"
  | "web"
  | "social"
  | "admin"
  | "other";

export type JobPriority = "standard" | "priority" | "rush";

export interface JobFile {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  status: "pending_validation" | "verified" | "rejected";
  uploadedAt: Date;
}

export interface JobDeliverable {
  id: string;
  name: string;
  url: string;
  key?: string; // R2 storage key
  size: number;
  mimeType: string;
  version: number;
  uploadedAt: Date;
}

export interface JobMessage {
  id: string;
  senderId: Types.ObjectId;
  senderRole: UserRole;
  message: string;
  timestamp: Date;
}

export type JobComplexity = "simple" | "medium" | "complex";

export interface JobAIAnalysis {
  requiredSkills: string[];
  complexity: JobComplexity;
  estimatedHours: number;
  confidence: number;
  analyzedAt: Date;
}

export interface Job {
  _id: Types.ObjectId;
  clientId: Types.ObjectId;
  workerId?: Types.ObjectId;
  assignedBy?: Types.ObjectId;

  title: string;
  description: string;
  category: JobCategory;
  priority: JobPriority;
  status: JobStatus;

  files: JobFile[];
  deliverables: JobDeliverable[];
  messages: JobMessage[];

  estimatedHours?: number;
  actualHours?: number;
  dueDate?: Date;

  rating?: number;
  feedback?: string;

  aiAnalysis?: JobAIAnalysis;
  contextFromPastWork?: string;

  createdAt: Date;
  updatedAt: Date;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// ===========================================
// API Response Types
// ===========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ===========================================
// Session Types (for NextAuth)
// ===========================================

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar?: string;
}
