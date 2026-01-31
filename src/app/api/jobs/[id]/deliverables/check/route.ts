// QA Check Endpoint for Job Deliverables
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/connection';
import { Job } from '@/lib/db/models';
import { checkDeliverable, getConfigForJobType, QAResult } from '@/lib/qa';
import { getPresignedDownloadUrl } from '@/lib/storage/r2';

interface DeliverableQAResult {
  fileName: string;
  fileKey: string;
  mimeType: string;
  result: QAResult;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/jobs/[id]/deliverables/check
 * Run QA checks on job deliverables before submission
 *
 * Body (optional):
 * - fileKeys: string[] - Specific files to check (defaults to all deliverables)
 * - config: object - Custom QA configuration overrides
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    await connectDB();

    const job = await Job.findById(id);
    if (!job) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } },
        { status: 404 }
      );
    }

    // Only assigned worker or admin can run QA
    const isWorker = job.workerId?.toString() === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isWorker && !isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to check this job' } },
        { status: 403 }
      );
    }

    // Parse request body
    let fileKeys: string[] | undefined;
    let customConfig: Record<string, unknown> | undefined;

    try {
      const body = await request.json();
      fileKeys = body.fileKeys;
      customConfig = body.config;
    } catch {
      // Empty body is OK
    }

    // Get deliverables to check
    const deliverables = job.deliverables || [];
    if (deliverables.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          results: [],
          summary: {
            total: 0,
            passed: 0,
            failed: 0,
            averageScore: 0,
          },
          message: 'No deliverables to check',
        },
      });
    }

    // Filter to specific files if requested
    const filesToCheck = fileKeys
      ? deliverables.filter((d: { key?: string; url: string }) => {
          const key = d.key || d.url;
          return fileKeys.includes(key);
        })
      : deliverables;

    if (filesToCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'No matching files found' } },
        { status: 400 }
      );
    }

    // Get QA config based on job type
    const qaConfig = getConfigForJobType(job.category || 'general');

    // Run QA checks on each deliverable
    const results: DeliverableQAResult[] = [];

    for (const deliverable of filesToCheck) {
      const fileKey = deliverable.key || deliverable.url;

      try {
        // Download file from R2
        const { downloadUrl } = await getPresignedDownloadUrl(fileKey);
        const response = await fetch(downloadUrl);

        if (!response.ok) {
          results.push({
            fileName: deliverable.name,
            fileKey,
            mimeType: deliverable.mimeType || 'unknown',
            result: {
              passed: false,
              score: 0,
              checks: [{
                name: 'download',
                passed: false,
                message: `Failed to download file: ${response.statusText}`,
              }],
              fileType: 'unknown',
              analyzedAt: new Date(),
            },
          });
          continue;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const mimeType = deliverable.mimeType || response.headers.get('content-type') || 'application/octet-stream';

        // Run QA checks
        const qaResult = await checkDeliverable(
          buffer,
          mimeType,
          undefined,
          customConfig ? { ...qaConfig, ...customConfig } : qaConfig
        );

        results.push({
          fileName: deliverable.name,
          fileKey,
          mimeType,
          result: qaResult,
        });
      } catch (error) {
        console.error(`QA check failed for ${deliverable.name}:`, error);
        results.push({
          fileName: deliverable.name,
          fileKey,
          mimeType: deliverable.mimeType || 'unknown',
          result: {
            passed: false,
            score: 0,
            checks: [{
              name: 'error',
              passed: false,
              message: `QA check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }],
            fileType: 'unknown',
            analyzedAt: new Date(),
          },
        });
      }
    }

    // Calculate summary
    const passed = results.filter(r => r.result.passed).length;
    const failed = results.length - passed;
    const averageScore = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.result.score, 0) / results.length)
      : 0;

    // Determine if submission should be blocked
    const hasBlockingIssues = results.some(r => {
      const integrityFailed = r.result.checks.some(c => c.name === 'integrity' && !c.passed);
      return integrityFailed;
    });

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          passed,
          failed,
          averageScore,
          canSubmit: !hasBlockingIssues,
          blockedReason: hasBlockingIssues ? 'One or more files failed integrity checks' : undefined,
        },
      },
    });
  } catch (error) {
    console.error('QA check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'QA check failed',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/[id]/deliverables/check
 * Get QA check results for job deliverables (cached results if available)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    await connectDB();

    const job = await Job.findById(id);
    if (!job) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } },
        { status: 404 }
      );
    }

    // Check access - worker, client, or admin
    const isWorker = job.workerId?.toString() === session.user.id;
    const isClient = job.clientId?.toString() === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isWorker && !isClient && !isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } },
        { status: 403 }
      );
    }

    // Return cached QA results if available
    const qaResults = job.qaResults || null;

    return NextResponse.json({
      success: true,
      data: {
        results: qaResults,
        hasResults: !!qaResults,
        deliverableCount: (job.deliverables || []).length,
      },
    });
  } catch (error) {
    console.error('Get QA results error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get QA results',
        },
      },
      { status: 500 }
    );
  }
}
