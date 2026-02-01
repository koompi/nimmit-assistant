// Admin Audit Log API
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/connection';
import { AuditLog } from '@/lib/db/models';

/**
 * GET /api/admin/audit
 * Get audit logs with filtering
 *
 * Query params:
 * - action: Filter by action type
 * - severity: Filter by severity (info, warning, critical)
 * - actorId: Filter by actor user ID
 * - targetType: Filter by target type (user, job, payment, file, system)
 * - targetId: Filter by target ID
 * - startDate: Filter from date (ISO string)
 * - endDate: Filter to date (ISO string)
 * - limit: Number of results (default 50, max 500)
 * - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;

    // Build query
    const query: Record<string, unknown> = {};

    const action = searchParams.get('action');
    if (action) {
      query.action = action;
    }

    const severity = searchParams.get('severity');
    if (severity) {
      query.severity = severity;
    }

    const actorId = searchParams.get('actorId');
    if (actorId) {
      query.actorId = actorId;
    }

    const targetType = searchParams.get('targetType');
    if (targetType) {
      query.targetType = targetType;
    }

    const targetId = searchParams.get('targetId');
    if (targetId) {
      query.targetId = targetId;
    }

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        (query.createdAt as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        (query.createdAt as Record<string, Date>).$lte = new Date(endDate);
      }
    }

    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Execute query
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    // Get action type counts for filters
    const actionCounts = await AuditLog.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Get severity counts
    const severityCounts = await AuditLog.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + logs.length < total,
        },
        filters: {
          actions: actionCounts.map(a => ({ action: a._id, count: a.count })),
          severities: severityCounts.map(s => ({ severity: s._id, count: s.count })),
        },
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get audit logs',
        },
      },
      { status: 500 }
    );
  }
}
