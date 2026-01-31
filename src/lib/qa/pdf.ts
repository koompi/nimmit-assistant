// PDF QA Checks
import { QACheck, QAConfig, PDFMetadata, DEFAULT_QA_CONFIG } from './types';

/**
 * Analyze PDF metadata from buffer
 * Uses basic PDF parsing without external dependencies
 */
export async function analyzePDF(buffer: Buffer): Promise<PDFMetadata> {
  const content = buffer.toString('latin1');

  const result: PDFMetadata = {
    pages: 0,
    size: buffer.length,
    isEncrypted: false,
    hasText: false,
    version: undefined,
  };

  // Check PDF signature
  if (!content.startsWith('%PDF-')) {
    return result;
  }

  // Extract version
  const versionMatch = content.match(/%PDF-(\d+\.\d+)/);
  if (versionMatch) {
    result.version = versionMatch[1];
  }

  // Check for encryption
  result.isEncrypted = content.includes('/Encrypt');

  // Count pages (look for /Type /Page entries)
  // This is a simple heuristic - not 100% accurate but works for most PDFs
  const pageMatches = content.match(/\/Type\s*\/Page[^s]/g);
  result.pages = pageMatches ? pageMatches.length : 0;

  // Alternative: look for /Count in page tree
  if (result.pages === 0) {
    const countMatch = content.match(/\/Count\s+(\d+)/);
    if (countMatch) {
      result.pages = parseInt(countMatch[1], 10);
    }
  }

  // Check for text content (look for text operators or stream content)
  result.hasText =
    content.includes('/Font') ||
    content.includes('Tj') ||
    content.includes('TJ') ||
    content.includes('/Text');

  return result;
}

/**
 * Run QA checks on a PDF
 */
export async function checkPDF(
  buffer: Buffer,
  config: QAConfig['pdf'] = DEFAULT_QA_CONFIG.pdf
): Promise<{ metadata: PDFMetadata; checks: QACheck[] }> {
  const metadata = await analyzePDF(buffer);
  const checks: QACheck[] = [];

  // Check PDF signature/integrity
  const isValid = metadata.version !== undefined;
  checks.push({
    name: 'integrity',
    passed: isValid,
    message: isValid
      ? `Valid PDF version ${metadata.version}`
      : 'Invalid PDF file - missing or corrupted header',
    details: { version: metadata.version },
  });

  if (!isValid) {
    return { metadata, checks };
  }

  // Check encryption
  checks.push({
    name: 'encryption',
    passed: !metadata.isEncrypted,
    message: metadata.isEncrypted
      ? 'PDF is encrypted - may require password to view'
      : 'PDF is not encrypted',
    details: { isEncrypted: metadata.isEncrypted },
  });

  // Check page count
  const pageCountOk = metadata.pages > 0 && metadata.pages <= config.maxPages;
  checks.push({
    name: 'pageCount',
    passed: pageCountOk,
    message: pageCountOk
      ? `${metadata.pages} pages within limit of ${config.maxPages}`
      : metadata.pages === 0
        ? 'Could not determine page count'
        : `${metadata.pages} pages exceeds limit of ${config.maxPages}`,
    details: { pages: metadata.pages, maxPages: config.maxPages },
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

  // Check for text content (if required)
  if (config.requireText) {
    checks.push({
      name: 'textContent',
      passed: metadata.hasText,
      message: metadata.hasText
        ? 'PDF contains text content'
        : 'PDF appears to be image-only (no extractable text)',
      details: { hasText: metadata.hasText },
    });
  }

  return { metadata, checks };
}
