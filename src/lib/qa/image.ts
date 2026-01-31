// Image QA Checks
import { QACheck, QAConfig, ImageMetadata, DEFAULT_QA_CONFIG } from './types';

/**
 * Analyze image metadata from buffer
 * Uses built-in image header parsing (no external deps)
 */
export async function analyzeImage(buffer: Buffer): Promise<ImageMetadata> {
  // Try to dynamically import sharp if available
  try {
    const sharp = await import('sharp');
    const metadata = await sharp.default(buffer).metadata();

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: buffer.length,
      hasAlpha: metadata.hasAlpha || false,
      colorSpace: metadata.space,
    };
  } catch {
    // Fallback: basic header parsing
    return parseImageHeader(buffer);
  }
}

/**
 * Basic image header parsing without sharp
 */
function parseImageHeader(buffer: Buffer): ImageMetadata {
  const result: ImageMetadata = {
    width: 0,
    height: 0,
    format: 'unknown',
    size: buffer.length,
    hasAlpha: false,
  };

  // PNG signature: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    result.format = 'png';
    result.width = buffer.readUInt32BE(16);
    result.height = buffer.readUInt32BE(20);
    const colorType = buffer[25];
    result.hasAlpha = colorType === 4 || colorType === 6;
  }
  // JPEG signature: FF D8 FF
  else if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    result.format = 'jpeg';
    // Parse JPEG dimensions from SOF marker
    let offset = 2;
    while (offset < buffer.length - 8) {
      if (buffer[offset] === 0xff) {
        const marker = buffer[offset + 1];
        // SOF0, SOF1, SOF2 markers contain dimensions
        if (marker >= 0xc0 && marker <= 0xc2) {
          result.height = buffer.readUInt16BE(offset + 5);
          result.width = buffer.readUInt16BE(offset + 7);
          break;
        }
        const length = buffer.readUInt16BE(offset + 2);
        offset += length + 2;
      } else {
        offset++;
      }
    }
  }
  // GIF signature: GIF87a or GIF89a
  else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    result.format = 'gif';
    result.width = buffer.readUInt16LE(6);
    result.height = buffer.readUInt16LE(8);
  }
  // WebP signature: RIFF....WEBP
  else if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[8] === 0x57 && buffer[9] === 0x45) {
    result.format = 'webp';
    // VP8 chunk parsing for dimensions
    if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38) {
      if (buffer[15] === 0x20) { // VP8
        result.width = (buffer.readUInt16LE(26) & 0x3fff);
        result.height = (buffer.readUInt16LE(28) & 0x3fff);
      } else if (buffer[15] === 0x4c) { // VP8L
        const bits = buffer.readUInt32LE(21);
        result.width = (bits & 0x3fff) + 1;
        result.height = ((bits >> 14) & 0x3fff) + 1;
      }
    }
  }

  return result;
}

/**
 * Run QA checks on an image
 */
export async function checkImage(
  buffer: Buffer,
  config: QAConfig['image'] = DEFAULT_QA_CONFIG.image
): Promise<{ metadata: ImageMetadata; checks: QACheck[] }> {
  const metadata = await analyzeImage(buffer);
  const checks: QACheck[] = [];

  // Check format
  const formatAllowed = config.allowedFormats.includes(metadata.format);
  checks.push({
    name: 'format',
    passed: formatAllowed,
    message: formatAllowed
      ? `Format ${metadata.format} is allowed`
      : `Format ${metadata.format} not in allowed list: ${config.allowedFormats.join(', ')}`,
    details: { format: metadata.format, allowed: config.allowedFormats },
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

  // Check file size
  const sizeMB = buffer.length / (1024 * 1024);
  const sizeOk = sizeMB <= config.maxSizeMB;
  checks.push({
    name: 'fileSize',
    passed: sizeOk,
    message: sizeOk
      ? `File size ${sizeMB.toFixed(2)}MB within limit of ${config.maxSizeMB}MB`
      : `File size ${sizeMB.toFixed(2)}MB exceeds limit of ${config.maxSizeMB}MB`,
    details: { sizeMB, maxSizeMB: config.maxSizeMB },
  });

  // Check image is valid (has dimensions)
  const isValid = metadata.width > 0 && metadata.height > 0;
  checks.push({
    name: 'integrity',
    passed: isValid,
    message: isValid ? 'Image file is valid' : 'Could not parse image dimensions - file may be corrupted',
    details: { width: metadata.width, height: metadata.height },
  });

  return { metadata, checks };
}
