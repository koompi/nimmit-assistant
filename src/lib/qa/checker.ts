// Main QA Checker
import { QAResult, QAConfig, DEFAULT_QA_CONFIG } from './types';
import { checkImage } from './image';
import { checkVideo, analyzeVideo } from './video';
import { checkPDF } from './pdf';

export * from './types';
export { checkImage } from './image';
export { checkVideo, analyzeVideo } from './video';
export { checkPDF } from './pdf';

/**
 * Determine file type from MIME type
 */
function getFileCategory(mimeType: string): 'image' | 'video' | 'pdf' | 'unknown' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'unknown';
}

/**
 * Calculate overall QA score from checks
 */
function calculateScore(checks: { passed: boolean; name: string }[]): number {
  if (checks.length === 0) return 0;

  // Weight certain checks more heavily
  const weights: Record<string, number> = {
    integrity: 3,
    resolution: 2,
    format: 1.5,
    codec: 1.5,
    fileSize: 1,
    encryption: 1,
    pageCount: 1,
    duration: 1,
    audio: 0.5,
    frameRate: 0.5,
    textContent: 0.5,
  };

  let totalWeight = 0;
  let weightedScore = 0;

  for (const check of checks) {
    const weight = weights[check.name] || 1;
    totalWeight += weight;
    if (check.passed) {
      weightedScore += weight;
    }
  }

  return Math.round((weightedScore / totalWeight) * 100);
}

/**
 * Run QA checks on a file
 *
 * @param buffer - File content as buffer
 * @param mimeType - MIME type of the file
 * @param filePath - Optional file path (needed for video analysis)
 * @param config - Optional custom QA configuration
 */
export async function checkDeliverable(
  buffer: Buffer,
  mimeType: string,
  filePath?: string,
  config: QAConfig = DEFAULT_QA_CONFIG
): Promise<QAResult> {
  const fileCategory = getFileCategory(mimeType);

  let checks: { name: string; passed: boolean; message?: string; details?: Record<string, unknown> }[] = [];

  switch (fileCategory) {
    case 'image': {
      const result = await checkImage(buffer, config.image);
      checks = result.checks;
      break;
    }

    case 'video': {
      if (filePath) {
        const result = await checkVideo(filePath, buffer.length, config.video);
        checks = result.checks;
      } else {
        // Need to write to temp file for video analysis
        const fs = await import('fs/promises');
        const os = await import('os');
        const path = await import('path');

        const tempPath = path.join(os.tmpdir(), `qa-video-${Date.now()}.tmp`);
        try {
          await fs.writeFile(tempPath, buffer);
          const result = await checkVideo(tempPath, buffer.length, config.video);
          checks = result.checks;
        } finally {
          try {
            await fs.unlink(tempPath);
          } catch {
            // Ignore cleanup errors
          }
        }
      }
      break;
    }

    case 'pdf': {
      const result = await checkPDF(buffer, config.pdf);
      checks = result.checks;
      break;
    }

    default:
      checks = [{
        name: 'fileType',
        passed: true,
        message: `File type ${mimeType} - no specific QA checks available`,
        details: { mimeType },
      }];
  }

  const passed = checks.every(c => c.passed);
  const score = calculateScore(checks);

  return {
    passed,
    score,
    checks,
    fileType: fileCategory,
    analyzedAt: new Date(),
  };
}

/**
 * Quick validation check - just checks if file passes critical checks
 */
export async function quickValidate(
  buffer: Buffer,
  mimeType: string
): Promise<{ valid: boolean; reason?: string }> {
  const fileCategory = getFileCategory(mimeType);

  switch (fileCategory) {
    case 'image': {
      const result = await checkImage(buffer);
      const integrity = result.checks.find(c => c.name === 'integrity');
      if (!integrity?.passed) {
        return { valid: false, reason: 'Image file is corrupted' };
      }
      return { valid: true };
    }

    case 'pdf': {
      const result = await checkPDF(buffer);
      const integrity = result.checks.find(c => c.name === 'integrity');
      if (!integrity?.passed) {
        return { valid: false, reason: 'PDF file is corrupted' };
      }
      return { valid: true };
    }

    case 'video':
      // Video validation requires ffprobe, skip quick check
      return { valid: true };

    default:
      return { valid: true };
  }
}

/**
 * Get recommended config based on job type
 */
export function getConfigForJobType(jobType: string): QAConfig {
  // Adjust thresholds based on job type
  switch (jobType.toLowerCase()) {
    case 'social_media':
      return {
        ...DEFAULT_QA_CONFIG,
        image: {
          ...DEFAULT_QA_CONFIG.image,
          minWidth: 1080,
          minHeight: 1080,
        },
        video: {
          ...DEFAULT_QA_CONFIG.video,
          minWidth: 1080,
          minHeight: 1920, // Vertical video for stories/reels
          maxDurationSeconds: 60,
        },
      };

    case 'print':
      return {
        ...DEFAULT_QA_CONFIG,
        image: {
          ...DEFAULT_QA_CONFIG.image,
          minWidth: 3000,
          minHeight: 2000,
        },
      };

    case 'web':
      return {
        ...DEFAULT_QA_CONFIG,
        image: {
          ...DEFAULT_QA_CONFIG.image,
          minWidth: 1200,
          minHeight: 800,
          maxSizeMB: 10, // Smaller for web
        },
      };

    default:
      return DEFAULT_QA_CONFIG;
  }
}
