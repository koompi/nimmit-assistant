// Admin Payout Processing API
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/connection';
import { User, Job } from '@/lib/db/models';
import { payWorker, getConnectAccountStatus, getPlatformBalance } from '@/lib/payments/stripe';
import { auditPayment, auditAdmin } from '@/lib/audit';

interface WorkerPayout {
  workerId: string;
  workerName: string;
  workerEmail: string;
  connectAccountId: string;
  pendingEarnings: number;
  jobCount: number;
}

/**
 * GET /api/admin/payouts/process
 * Get pending payouts and platform balance
 */
export async function GET() {
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

    // Get platform balance
    let platformBalance = { available: 0, pending: 0 };
    try {
      platformBalance = await getPlatformBalance();
    } catch (err) {
      console.error('Failed to get platform balance:', err);
    }

    // Get workers with pending earnings
    const workersWithPending = await User.find({
      role: 'worker',
      'workerProfile.pendingEarnings': { $gt: 0 },
      'workerProfile.stripeConnectAccountId': { $exists: true, $ne: null },
    }).select('email profile workerProfile');

    const pendingPayouts: WorkerPayout[] = [];
    let totalPendingAmount = 0;

    for (const worker of workersWithPending) {
      const connectAccountId = worker.workerProfile?.stripeConnectAccountId;
      if (!connectAccountId) continue;

      // Check if account can receive payouts
      const accountStatus = await getConnectAccountStatus(connectAccountId);
      if (!accountStatus?.payoutsEnabled) continue;

      const pendingEarnings = worker.workerProfile?.pendingEarnings || 0;
      totalPendingAmount += pendingEarnings;

      // Count jobs awaiting payout
      const jobCount = await Job.countDocuments({
        workerId: worker._id,
        status: 'completed',
        workerPaidAt: { $exists: false },
      });

      pendingPayouts.push({
        workerId: worker._id.toString(),
        workerName: `${worker.profile.firstName} ${worker.profile.lastName}`,
        workerEmail: worker.email,
        connectAccountId,
        pendingEarnings,
        jobCount,
      });
    }

    // Get workers without Connect accounts who have earnings
    const workersNeedingConnect = await User.find({
      role: 'worker',
      'workerProfile.pendingEarnings': { $gt: 0 },
      $or: [
        { 'workerProfile.stripeConnectAccountId': { $exists: false } },
        { 'workerProfile.stripeConnectAccountId': null },
      ],
    }).select('email profile workerProfile.pendingEarnings');

    const needingSetup = workersNeedingConnect.map(w => ({
      workerId: w._id.toString(),
      workerName: `${w.profile.firstName} ${w.profile.lastName}`,
      workerEmail: w.email,
      pendingEarnings: w.workerProfile?.pendingEarnings || 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        platformBalance: {
          available: platformBalance.available / 100, // Convert to dollars
          pending: platformBalance.pending / 100,
        },
        pendingPayouts,
        totalPendingAmount,
        workersNeedingSetup: needingSetup,
      },
    });
  } catch (error) {
    console.error('Get payouts error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get payouts',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/payouts/process
 * Process payouts to workers
 *
 * Body:
 * - workerIds: string[] - Specific workers to pay (optional, pays all if not provided)
 */
export async function POST(request: NextRequest) {
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

    let workerIds: string[] | undefined;
    try {
      const body = await request.json();
      workerIds = body.workerIds;
    } catch {
      // Empty body is OK - process all
    }

    await connectDB();

    // Build query for workers to pay
    const query: Record<string, unknown> = {
      role: 'worker',
      'workerProfile.pendingEarnings': { $gt: 0 },
      'workerProfile.stripeConnectAccountId': { $exists: true, $ne: null },
    };

    if (workerIds && workerIds.length > 0) {
      query._id = { $in: workerIds };
    }

    const workers = await User.find(query);

    const results: {
      workerId: string;
      workerEmail: string;
      amount: number;
      success: boolean;
      transferId?: string;
      error?: string;
    }[] = [];

    let totalPaid = 0;
    let successCount = 0;
    let failCount = 0;

    for (const worker of workers) {
      const connectAccountId = worker.workerProfile?.stripeConnectAccountId;
      const pendingEarnings = worker.workerProfile?.pendingEarnings || 0;

      if (!connectAccountId || pendingEarnings <= 0) continue;

      // Verify account can receive payouts
      const accountStatus = await getConnectAccountStatus(connectAccountId);
      if (!accountStatus?.payoutsEnabled) {
        results.push({
          workerId: worker._id.toString(),
          workerEmail: worker.email,
          amount: pendingEarnings,
          success: false,
          error: 'Connect account not ready for payouts',
        });
        failCount++;
        continue;
      }

      try {
        // Process payout
        const amountCents = Math.round(pendingEarnings * 100);
        const { transferId } = await payWorker(
          connectAccountId,
          amountCents,
          'batch_payout',
          `Batch payout - ${new Date().toISOString().split('T')[0]}`
        );

        // Update worker's pending earnings and mark jobs as paid
        await User.findByIdAndUpdate(worker._id, {
          $set: { 'workerProfile.pendingEarnings': 0 },
          $inc: { 'workerProfile.stats.totalEarnings': pendingEarnings },
        });

        // Mark completed jobs as paid
        await Job.updateMany(
          {
            workerId: worker._id,
            status: 'completed',
            workerPaidAt: { $exists: false },
          },
          {
            $set: { workerPaidAt: new Date() },
          }
        );

        results.push({
          workerId: worker._id.toString(),
          workerEmail: worker.email,
          amount: pendingEarnings,
          success: true,
          transferId,
        });

        // Audit log: payout processed
        auditPayment(
          'payment.payout_processed',
          { id: session.user.id, email: session.user.email, role: 'admin' },
          `Payout of $${pendingEarnings.toFixed(2)} to ${worker.email}`,
          { workerId: worker._id.toString(), amount: pendingEarnings, transferId }
        );

        totalPaid += pendingEarnings;
        successCount++;
      } catch (err) {
        console.error(`Payout failed for worker ${worker.email}:`, err);
        results.push({
          workerId: worker._id.toString(),
          workerEmail: worker.email,
          amount: pendingEarnings,
          success: false,
          error: err instanceof Error ? err.message : 'Transfer failed',
        });
        failCount++;
      }
    }

    // Audit log: batch payout summary
    if (successCount > 0) {
      auditAdmin(
        { id: session.user.id, email: session.user.email },
        `Batch payout processed: ${successCount} workers, $${totalPaid.toFixed(2)} total`,
        { successCount, failCount, totalPaid }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          totalPaid,
          successCount,
          failCount,
          processedAt: new Date(),
        },
      },
      message: `Processed ${successCount} payouts totaling $${totalPaid.toFixed(2)}`,
    });
  } catch (error) {
    console.error('Process payouts error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to process payouts',
        },
      },
      { status: 500 }
    );
  }
}
