// Audit Logging Utility
import { Types } from 'mongoose';
import { AuditLog, AuditAction, AuditSeverity } from '@/lib/db/models/audit-log';

export type { AuditAction, AuditSeverity } from '@/lib/db/models/audit-log';

interface AuditLogParams {
  action: AuditAction;
  severity?: AuditSeverity;
  actorId?: string | Types.ObjectId;
  actorEmail?: string;
  actorRole?: string;
  targetType?: 'user' | 'job' | 'payment' | 'file' | 'system';
  targetId?: string | Types.ObjectId;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 * This is async but doesn't need to be awaited - fire and forget
 */
export async function audit(params: AuditLogParams): Promise<void> {
  try {
    await AuditLog.create({
      action: params.action,
      severity: params.severity || 'info',
      actorId: params.actorId ? new Types.ObjectId(params.actorId.toString()) : undefined,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      targetType: params.targetType,
      targetId: params.targetId ? new Types.ObjectId(params.targetId.toString()) : undefined,
      description: params.description,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  } catch (error) {
    // Log but don't throw - audit logging should never break the main flow
    console.error('Audit log failed:', error);
  }
}

/**
 * Audit helper for user actions
 */
export function auditUser(
  action: Extract<AuditAction, `user.${string}`>,
  actor: { id?: string; email?: string; role?: string },
  targetUserId: string,
  description: string,
  metadata?: Record<string, unknown>
) {
  return audit({
    action,
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    targetType: 'user',
    targetId: targetUserId,
    description,
    metadata,
  });
}

/**
 * Audit helper for job actions
 */
export function auditJob(
  action: Extract<AuditAction, `job.${string}`>,
  actor: { id?: string; email?: string; role?: string },
  jobId: string,
  description: string,
  metadata?: Record<string, unknown>
) {
  return audit({
    action,
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    targetType: 'job',
    targetId: jobId,
    description,
    metadata,
  });
}

/**
 * Audit helper for payment actions
 */
export function auditPayment(
  action: Extract<AuditAction, `payment.${string}`>,
  actor: { id?: string; email?: string; role?: string },
  description: string,
  metadata?: Record<string, unknown>
) {
  return audit({
    action,
    severity: action.includes('payout') ? 'warning' : 'info',
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    targetType: 'payment',
    description,
    metadata,
  });
}

/**
 * Audit helper for admin actions
 */
export function auditAdmin(
  actor: { id: string; email: string },
  description: string,
  metadata?: Record<string, unknown>
) {
  return audit({
    action: 'admin.action',
    severity: 'warning',
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: 'admin',
    targetType: 'system',
    description,
    metadata,
  });
}

/**
 * Audit helper for critical security events
 */
export function auditSecurity(
  description: string,
  actor?: { id?: string; email?: string },
  metadata?: Record<string, unknown>
) {
  return audit({
    action: 'admin.action',
    severity: 'critical',
    actorId: actor?.id,
    actorEmail: actor?.email,
    targetType: 'system',
    description,
    metadata,
  });
}
