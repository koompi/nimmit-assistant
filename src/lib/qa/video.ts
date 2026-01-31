// Video QA Checks
import { exec } from 'child_process';
import { promisify } from 'util';
import { QACheck, QAConfig, VideoMetadata, DEFAULT_QA_CONFIG } from './types';

const execAsync = promisify(exec);

/**
 * Analyze video metadata using ffprobe
 */
export async function analyzeVideo(filePath: string): Promise<VideoMetadata> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`,
      { timeout: 30000 }
    );

    const data = JSON.parse(stdout);
    const videoStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === 'video');
    const audioStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === 'audio');
    const format = data.format || {};

    if (!videoStream) {
      throw new Error('No video stream found');
    }

    // Parse frame rate (can be "30/1" or "29.97")
    let fps = 0;
    if (videoStream.r_frame_rate) {
      const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
      fps = den ? num / den : num;
    }

    return {
      width: videoStream.width || 0,
      height: videoStream.height || 0,
      duration: parseFloat(format.duration) || 0,
      codec: videoStream.codec_name || 'unknown',
      fps: Math.round(fps * 100) / 100,
      bitrate: parseInt(format.bit_rate) || 0,
      hasAudio: !!audioStream,
      audioCodec: audioStream?.codec_name,
    };
  } catch (error) {
    // ffprobe not available or failed
    console.error('Video analysis failed:', error);
    return {
      width: 0,
      height: 0,
      duration: 0,
      codec: 'unknown',
      fps: 0,
      bitrate: 0,
      hasAudio: false,
    };
  }
}

/**
 * Analyze video from buffer by writing to temp file
 */
export async function analyzeVideoBuffer(buffer: Buffer): Promise<VideoMetadata> {
  const fs = await import('fs/promises');
  const os = await import('os');
  const path = await import('path');

  const tempPath = path.join(os.tmpdir(), `qa-video-${Date.now()}.tmp`);

  try {
    await fs.writeFile(tempPath, buffer);
    return await analyzeVideo(tempPath);
  } finally {
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Run QA checks on a video
 */
export async function checkVideo(
  filePath: string,
  fileSize: number,
  config: QAConfig['video'] = DEFAULT_QA_CONFIG.video
): Promise<{ metadata: VideoMetadata; checks: QACheck[] }> {
  const metadata = await analyzeVideo(filePath);
  const checks: QACheck[] = [];

  // Check if ffprobe worked
  const isValid = metadata.width > 0 && metadata.height > 0;
  checks.push({
    name: 'integrity',
    passed: isValid,
    message: isValid
      ? 'Video file is valid and readable'
      : 'Could not analyze video - file may be corrupted or ffprobe not available',
    details: { width: metadata.width, height: metadata.height },
  });

  if (!isValid) {
    return { metadata, checks };
  }

  // Check codec
  const codecAllowed = config.allowedCodecs.includes(metadata.codec.toLowerCase());
  checks.push({
    name: 'codec',
    passed: codecAllowed,
    message: codecAllowed
      ? `Codec ${metadata.codec} is allowed`
      : `Codec ${metadata.codec} not in allowed list: ${config.allowedCodecs.join(', ')}`,
    details: { codec: metadata.codec, allowed: config.allowedCodecs },
  });

  // Check resolution
  const meetsMinResolution = metadata.width >= config.minWidth && metadata.height >= config.minHeight;
  checks.push({
    name: 'resolution',
    passed: meetsMinResolution,
    message: meetsMinResolution
      ? `Resolution ${metadata.width}x${metadata.height} meets minimum ${config.minWidth}x${config.minHeight}`
      : `Resolution ${metadata.width}x${metadata.height} below minimum ${config.minWidth}x${config.minHeight}`,
    details: {
      width: metadata.width,
      height: metadata.height,
      minWidth: config.minWidth,
      minHeight: config.minHeight,
    },
  });

  // Check duration
  const durationOk = metadata.duration <= config.maxDurationSeconds;
  checks.push({
    name: 'duration',
    passed: durationOk,
    message: durationOk
      ? `Duration ${formatDuration(metadata.duration)} within limit`
      : `Duration ${formatDuration(metadata.duration)} exceeds limit of ${formatDuration(config.maxDurationSeconds)}`,
    details: { duration: metadata.duration, maxDuration: config.maxDurationSeconds },
  });

  // Check file size
  const sizeMB = fileSize / (1024 * 1024);
  const sizeOk = sizeMB <= config.maxSizeMB;
  checks.push({
    name: 'fileSize',
    passed: sizeOk,
    message: sizeOk
      ? `File size ${sizeMB.toFixed(2)}MB within limit of ${config.maxSizeMB}MB`
      : `File size ${sizeMB.toFixed(2)}MB exceeds limit of ${config.maxSizeMB}MB`,
    details: { sizeMB, maxSizeMB: config.maxSizeMB },
  });

  // Check audio (if required)
  if (config.requireAudio) {
    checks.push({
      name: 'audio',
      passed: metadata.hasAudio,
      message: metadata.hasAudio
        ? `Audio track present (${metadata.audioCodec})`
        : 'No audio track found - audio is required',
      details: { hasAudio: metadata.hasAudio, audioCodec: metadata.audioCodec },
    });
  }

  // Check frame rate (informational, usually not a hard requirement)
  const fpsOk = metadata.fps >= 24;
  checks.push({
    name: 'frameRate',
    passed: fpsOk,
    message: fpsOk
      ? `Frame rate ${metadata.fps}fps is acceptable`
      : `Frame rate ${metadata.fps}fps is below recommended 24fps`,
    details: { fps: metadata.fps },
  });

  return { metadata, checks };
}

/**
 * Format duration in human-readable format
 */
function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  } else if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}
