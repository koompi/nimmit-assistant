import mongoose, { Schema, Model, Document, Types } from "mongoose";

// ===========================================
// Audit Log Types
// ===========================================

export type AuditAction =
  | 'user.created'
  | 'user.updated'
  | 'user.deactivated'
  | 'user.login'
  | 'user.logout'
  | 'job.created'
  | 'job.assigned'
  | 'job.started'
  | 'job.submitted'
  | 'job.approved'
  | 'job.revision_requested'
  | 'job.completed'
  | 'job.cancelled'
  | 'job.flagged'
  | 'payment.subscription_created'
  | 'payment.subscription_cancelled'
  | 'payment.credits_added'
  | 'payment.credits_deducted'
  | 'payment.payout_processed'
  | 'file.uploaded'
  | 'file.deleted'
  | 'settings.updated'
  | 'admin.action';

export type AuditSeverity = 'info' | 'warning' | 'critical';

// ===========================================
// Audit Log Interface
// ===========================================

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  action: AuditAction;
  severity: AuditSeverity;
  actorId?: Types.ObjectId; // User who performed the action (null for system)
  actorEmail?: string;
  actorRole?: string;
  targetType?: 'user' | 'job' | 'payment' | 'file' | 'system';
  targetId?: Types.ObjectId;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ===========================================
// Audit Log Schema
// ===========================================

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    actorEmail: {
      type: String,
    },
    actorRole: {
      type: String,
    },
    targetType: {
      type: String,
      enum: ['user', 'job', 'payment', 'file', 'system'],
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ===========================================
// Indexes
// ===========================================

// For querying by time range
AuditLogSchema.index({ createdAt: -1 });

// For filtering by actor and action
AuditLogSchema.index({ actorId: 1, action: 1, createdAt: -1 });

// For filtering by target
AuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

// TTL index - auto-delete logs older than 90 days
AuditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

// ===========================================
// Export Model
// ===========================================

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
