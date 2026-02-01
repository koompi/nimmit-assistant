// Worker Stripe Connect API
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/connection';
import { User } from '@/lib/db/models';
import {
  createConnectAccount,
  createConnectOnboardingLink,
  createConnectLoginLink,
  getConnectAccountStatus,
  getWorkerTransfers,
} from '@/lib/payments/stripe';

/**
 * GET /api/worker/connect
 * Get worker's Connect account status and payout history
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

    if (session.user.role !== 'worker') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Worker access required' } },
        { status: 403 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    const connectAccountId = user.workerProfile?.stripeConnectAccountId;

    if (!connectAccountId) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          status: 'not_connected',
          pendingEarnings: user.workerProfile?.pendingEarnings || 0,
          totalEarnings: user.workerProfile?.stats?.totalEarnings || 0,
        },
      });
    }

    // Get account status from Stripe
    const accountStatus = await getConnectAccountStatus(connectAccountId);

    // Get recent transfers
    let recentPayouts: { id: string; amount: number; createdAt: Date; jobId?: string }[] = [];
    if (accountStatus?.payoutsEnabled) {
      try {
        const transfers = await getWorkerTransfers(connectAccountId, 10);
        recentPayouts = transfers.map(t => ({
          id: t.id,
          amount: t.amount / 100, // Convert cents to dollars
          createdAt: new Date(t.created * 1000),
          jobId: t.metadata?.jobId,
        }));
      } catch (err) {
        console.error('Failed to fetch transfers:', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        accountId: connectAccountId,
        status: user.workerProfile?.stripeConnectStatus || 'pending',
        chargesEnabled: accountStatus?.chargesEnabled || false,
        payoutsEnabled: accountStatus?.payoutsEnabled || false,
        detailsSubmitted: accountStatus?.detailsSubmitted || false,
        requirements: accountStatus?.requirements,
        pendingEarnings: user.workerProfile?.pendingEarnings || 0,
        totalEarnings: user.workerProfile?.stats?.totalEarnings || 0,
        recentPayouts,
      },
    });
  } catch (error) {
    console.error('Get Connect status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get Connect status',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/worker/connect
 * Create or update Connect account and get onboarding link
 *
 * Body:
 * - action: 'create' | 'onboard' | 'dashboard'
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

    if (session.user.role !== 'worker') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Worker access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    let connectAccountId = user.workerProfile?.stripeConnectAccountId;

    switch (action) {
      case 'create': {
        // Create new Connect account if not exists
        if (connectAccountId) {
          return NextResponse.json(
            { success: false, error: { code: 'ALREADY_EXISTS', message: 'Connect account already exists' } },
            { status: 400 }
          );
        }

        connectAccountId = await createConnectAccount(user.email, {
          userId: user._id.toString(),
          userEmail: user.email,
        });

        // Save to user
        await User.findByIdAndUpdate(user._id, {
          'workerProfile.stripeConnectAccountId': connectAccountId,
          'workerProfile.stripeConnectStatus': 'pending',
        });

        // Get onboarding link
        const onboardingUrl = await createConnectOnboardingLink(
          connectAccountId,
          `${baseUrl}/worker/settings?connect=refresh`,
          `${baseUrl}/worker/settings?connect=complete`
        );

        return NextResponse.json({
          success: true,
          data: {
            accountId: connectAccountId,
            onboardingUrl,
          },
          message: 'Connect account created. Complete onboarding to receive payouts.',
        });
      }

      case 'onboard': {
        // Get onboarding link for existing account
        if (!connectAccountId) {
          return NextResponse.json(
            { success: false, error: { code: 'NOT_FOUND', message: 'Connect account not found. Create one first.' } },
            { status: 404 }
          );
        }

        const onboardingUrl = await createConnectOnboardingLink(
          connectAccountId,
          `${baseUrl}/worker/settings?connect=refresh`,
          `${baseUrl}/worker/settings?connect=complete`
        );

        return NextResponse.json({
          success: true,
          data: { onboardingUrl },
        });
      }

      case 'dashboard': {
        // Get Stripe Express dashboard link
        if (!connectAccountId) {
          return NextResponse.json(
            { success: false, error: { code: 'NOT_FOUND', message: 'Connect account not found' } },
            { status: 404 }
          );
        }

        const dashboardUrl = await createConnectLoginLink(connectAccountId);

        return NextResponse.json({
          success: true,
          data: { dashboardUrl },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid action' } },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Connect action error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Connect action failed',
        },
      },
      { status: 500 }
    );
  }
}
