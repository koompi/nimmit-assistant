// QA Types

export interface QACheck {
  name: string;
  passed: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

export interface QAResult {
  passed: boolean;
  score: number; // 0-100
  checks: QACheck[];
  fileType: string;
  analyzedAt: Date;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
  colorSpace?: string;
}

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  codec: string;
  fps: number;
  bitrate: number;
  hasAudio: boolean;
  audioCodec?: string;
}

export interface PDFMetadata {
  pages: number;
  size: number;
  isEncrypted: boolean;
  hasText: boolean;
  version?: string;
}

export interface QAConfig {
  image: {
    minWidth: number;
    minHeight: number;
    maxSizeMB: number;
    allowedFormats: string[];
  };
  video: {
    minWidth: number;
    minHeight: number;
    maxDurationSeconds: number;
    maxSizeMB: number;
    allowedCodecs: string[];
    requireAudio: boolean;
  };
  pdf: {
    maxPages: number;
    maxSizeMB: number;
    requireText: boolean;
  };
}

export const DEFAULT_QA_CONFIG: QAConfig = {
  image: {
    minWidth: 1920,
    minHeight: 1080,
    maxSizeMB: 50,
    allowedFormats: ['jpeg', 'png', 'webp', 'gif'],
  },
  video: {
    minWidth: 1920,
    minHeight: 1080,
    maxDurationSeconds: 3600, // 1 hour max
    maxSizeMB: 500,
    allowedCodecs: ['h264', 'hevc', 'vp9', 'av1'],
    requireAudio: false,
  },
  pdf: {
    maxPages: 500,
    maxSizeMB: 100,
    requireText: false,
  },
};
