import mongoose, { Schema, Model, Document, Types } from "mongoose";
import type { JobCategory, JobPriority } from "@/types";

// ===========================================
// Briefing Message Types
// ===========================================

export interface BriefingMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ===========================================
// Extracted Brief Types
// ===========================================

export interface ExtractedBrief {
  title: string;
  description: string;
  category: JobCategory;
  priority: JobPriority;
  estimatedHours?: number;
  keyRequirements: string[];
  deliverables: string[];
  confidence: number;
}

// ===========================================
// Briefing Session Document Interface
// ===========================================

export interface IBriefing extends Document {
  _id: Types.ObjectId;
  clientId: Types.ObjectId;

  // Conversation state
  messages: BriefingMessage[];
  status: "active" | "completed" | "abandoned";

  // Extracted information (progressively updated)
  extractedBrief?: ExtractedBrief;

  // Context from past work
  contextSummary?: string;

  // If converted to a job
  jobId?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// ===========================================
// Sub-Schemas
// ===========================================

const BriefingMessageSchema = new Schema<BriefingMessage>(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ExtractedBriefSchema = new Schema<ExtractedBrief>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["video", "design", "web", "social", "admin", "other"],
      required: true,
    },
    priority: {
      type: String,
      enum: ["standard", "priority", "rush"],
      default: "standard",
    },
    estimatedHours: { type: Number },
    keyRequirements: { type: [String], default: [] },
    deliverables: { type: [String], default: [] },
    confidence: { type: Number, min: 0, max: 1, required: true },
  },
  { _id: false }
);

// ===========================================
// Briefing Schema
// ===========================================

const BriefingSchema = new Schema<IBriefing>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    messages: { type: [BriefingMessageSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "completed", "abandoned"],
      default: "active",
      index: true,
    },

    extractedBrief: { type: ExtractedBriefSchema },
    contextSummary: { type: String },

    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
    },

    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// ===========================================
// Indexes
// ===========================================

// Find active briefing for a client
BriefingSchema.index({ clientId: 1, status: 1 });

// ===========================================
// Export Model
// ===========================================

export const Briefing: Model<IBriefing> =
  mongoose.models.Briefing || mongoose.model<IBriefing>("Briefing", BriefingSchema);

export default Briefing;
