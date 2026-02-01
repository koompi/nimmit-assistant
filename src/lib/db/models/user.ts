import mongoose, { Schema, Model, Document, Types } from "mongoose";
import type {
  UserRole,
  WorkerAvailability,
  SkillLevel,
  WorkerProfile,
  ClientProfile,
  UserProfile,
} from "@/types";

// ===========================================
// Sub-Schemas
// ===========================================

const WorkerStatsSchema = new Schema(
  {
    completedJobs: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
  },
  { _id: false }
);

const WorkerProfileSchema = new Schema(
  {
    skills: { type: [String], default: [] },
    skillLevels: {
      type: Map,
      of: {
        type: String,
        enum: ["junior", "mid", "senior"] as SkillLevel[],
      },
      default: {},
    },
    availability: {
      type: String,
      enum: ["available", "busy", "offline"] as WorkerAvailability[],
      default: "offline",
    },
    currentJobCount: { type: Number, default: 0 },
    maxConcurrentJobs: { type: Number, default: 3 },
    stats: { type: WorkerStatsSchema, default: () => ({}) },
    bio: { type: String },
    // Stripe Connect for payouts
    stripeConnectAccountId: { type: String },
    stripeConnectStatus: {
      type: String,
      enum: ["pending", "active", "restricted", "disabled"],
      default: "pending",
    },
    pendingEarnings: { type: Number, default: 0 }, // Earnings not yet paid out
  },
  { _id: false }
);

const ClientBillingSchema = new Schema(
  {
    stripeCustomerId: { type: String },
    subscriptionId: { type: String },
    subscriptionTier: {
      type: String,
      enum: ["starter", "growth", "scale"],
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "canceled", "past_due", "trialing"],
    },
    credits: { type: Number, default: 0 },
    rolloverCredits: { type: Number, default: 0 },
    billingPeriodStart: { type: Date },
    billingPeriodEnd: { type: Date },
  },
  { _id: false }
);

const OnboardingDataSchema = new Schema(
  {
    companySize: {
      type: String,
      enum: ["solo", "2-10", "11-50", "51-200", "200+"],
    },
    industry: { type: String },
    primaryTaskTypes: { type: [String], default: [] },
    howDidYouHear: { type: String },
    completedAt: { type: Date },
  },
  { _id: false }
);

const ClientProfileSchema = new Schema(
  {
    company: { type: String },
    preferredWorkerId: { type: Schema.Types.ObjectId, ref: "User" },
    totalJobs: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    billing: { type: ClientBillingSchema, default: () => ({ credits: 0, rolloverCredits: 0 }) },
    onboardingCompleted: { type: Boolean, default: false },
    onboarding: { type: OnboardingDataSchema },
  },
  { _id: false }
);

const UserProfileSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    avatar: { type: String },
    timezone: { type: String, default: "America/Los_Angeles" },
    phone: { type: String },
  },
  { _id: false }
);

const NotificationPreferencesSchema = new Schema(
  {
    // Email notifications
    emailEnabled: { type: Boolean, default: true },
    emailJobAssigned: { type: Boolean, default: true },
    emailJobStarted: { type: Boolean, default: true },
    emailJobSubmitted: { type: Boolean, default: true },
    emailJobCompleted: { type: Boolean, default: true },
    emailJobRevision: { type: Boolean, default: true },
    emailNewMessage: { type: Boolean, default: true },
    emailPaymentReceived: { type: Boolean, default: true },
    emailWeeklyDigest: { type: Boolean, default: false },
    // In-app notifications (always on but can control what shows)
    inAppEnabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const UserSettingsSchema = new Schema(
  {
    notifications: { type: NotificationPreferencesSchema, default: () => ({}) },
    // Future settings can be added here
  },
  { _id: false }
);

// ===========================================
// User Document Interface
// ===========================================

export interface NotificationPreferences {
  emailEnabled: boolean;
  emailJobAssigned: boolean;
  emailJobStarted: boolean;
  emailJobSubmitted: boolean;
  emailJobCompleted: boolean;
  emailJobRevision: boolean;
  emailNewMessage: boolean;
  emailPaymentReceived: boolean;
  emailWeeklyDigest: boolean;
  inAppEnabled: boolean;
}

export interface UserSettings {
  notifications: NotificationPreferences;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: UserRole;
  profile: UserProfile;
  workerProfile?: WorkerProfile;
  clientProfile?: ClientProfile;
  settings?: UserSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// User Schema
// ===========================================

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Don't include in queries by default
    },
    role: {
      type: String,
      enum: ["client", "worker", "admin"] as UserRole[],
      required: true,
      index: true,
    },
    profile: {
      type: UserProfileSchema,
      required: true,
    },
    workerProfile: {
      type: WorkerProfileSchema,
      required: function (this: IUser) {
        return this.role === "worker";
      },
    },
    clientProfile: {
      type: ClientProfileSchema,
      required: function (this: IUser) {
        return this.role === "client";
      },
    },
    settings: {
      type: UserSettingsSchema,
      default: () => ({ notifications: {} }),
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ===========================================
// Indexes
// ===========================================

UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ "workerProfile.availability": 1 }, { sparse: true });
UserSchema.index({ "workerProfile.skills": 1 }, { sparse: true });

// ===========================================
// Virtual for full name
// ===========================================

UserSchema.virtual("fullName").get(function (this: IUser) {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

// ===========================================
// Export Model
// ===========================================

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
