import NodeClam from "clamscan";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { logger } from "@/lib/logger";

// ===========================================
// ClamAV Configuration
// ===========================================

let clamav: NodeClam | null = null;

async function getClamAV(): Promise<NodeClam | null> {
  if (clamav) return clamav;

  // Check if ClamAV is enabled
  if (process.env.CLAMAV_ENABLED !== "true") {
    logger.info("VirusScan", "ClamAV disabled - skipping virus scanning");
    return null;
  }

  try {
    clamav = await new NodeClam().init({
      removeInfected: false,
      debugMode: process.env.NODE_ENV === "development",
      scanRecursively: false,
      clamdscan: {
        socket: process.env.CLAMAV_SOCKET || "/var/run/clamav/clamd.ctl",
        host: process.env.CLAMAV_HOST || "127.0.0.1",
        port: Number(process.env.CLAMAV_PORT) || 3310,
        timeout: 60000,
        localFallback: true,
        path: process.env.CLAMAV_PATH || "/usr/bin/clamdscan",
        configFile: process.env.CLAMAV_CONFIG || undefined,
        multiscan: true,
        reloadDb: false,
        active: true,
      },
      preference: "clamdscan",
    });

    logger.info("VirusScan", "ClamAV initialized successfully");
    return clamav;
  } catch (error) {
    logger.error("VirusScan", "Failed to initialize ClamAV", { error: String(error) });
    return null;
  }
}

// ===========================================
// R2 Client for fetching files
// ===========================================

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "nimmit-files";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// ===========================================
// Virus Scan Types
// ===========================================

export interface ScanResult {
  isClean: boolean;
  isInfected: boolean;
  viruses: string[];
  scannedAt: Date;
  error?: string;
}

// ===========================================
// Scan Functions
// ===========================================

/**
 * Scan a file from R2 storage for viruses
 */
export async function scanFileFromR2(key: string): Promise<ScanResult> {
  const clam = await getClamAV();

  // If ClamAV not available, assume clean (with warning)
  if (!clam) {
    logger.warn("VirusScan", "ClamAV not available, skipping scan", { key });
    return {
      isClean: true,
      isInfected: false,
      viruses: [],
      scannedAt: new Date(),
      error: "ClamAV not configured",
    };
  }

  try {
    // Fetch file from R2
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error("Empty file body from R2");
    }

    // Convert to readable stream
    const stream = response.Body as Readable;

    // Scan the stream
    const { isInfected, viruses } = await clam.scanStream(stream);

    logger.info("VirusScan", `Scan complete for ${key}`, {
      isInfected,
      viruses: viruses || [],
    });

    return {
      isClean: !isInfected,
      isInfected: isInfected || false,
      viruses: viruses || [],
      scannedAt: new Date(),
    };
  } catch (error) {
    logger.error("VirusScan", `Scan failed for ${key}`, { error: String(error) });
    return {
      isClean: false,
      isInfected: false,
      viruses: [],
      scannedAt: new Date(),
      error: String(error),
    };
  }
}

/**
 * Scan a buffer for viruses
 */
export async function scanBuffer(buffer: Buffer): Promise<ScanResult> {
  const clam = await getClamAV();

  if (!clam) {
    return {
      isClean: true,
      isInfected: false,
      viruses: [],
      scannedAt: new Date(),
      error: "ClamAV not configured",
    };
  }

  try {
    const stream = Readable.from(buffer);
    const { isInfected, viruses } = await clam.scanStream(stream);

    return {
      isClean: !isInfected,
      isInfected: isInfected || false,
      viruses: viruses || [],
      scannedAt: new Date(),
    };
  } catch (error) {
    return {
      isClean: false,
      isInfected: false,
      viruses: [],
      scannedAt: new Date(),
      error: String(error),
    };
  }
}

/**
 * Check if ClamAV is available
 */
export async function isClamAVAvailable(): Promise<boolean> {
  const clam = await getClamAV();
  return clam !== null;
}
