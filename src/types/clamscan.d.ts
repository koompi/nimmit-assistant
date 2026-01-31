declare module "clamscan" {
  interface ClamScanOptions {
    removeInfected?: boolean;
    debugMode?: boolean;
    scanRecursively?: boolean;
    clamdscan?: {
      socket?: string;
      host?: string;
      port?: number;
      timeout?: number;
      localFallback?: boolean;
      path?: string;
      configFile?: string;
      multiscan?: boolean;
      reloadDb?: boolean;
      active?: boolean;
    };
    preference?: "clamdscan" | "clamscan";
  }

  interface ScanResult {
    isInfected: boolean;
    viruses?: string[];
    file?: string;
  }

  class NodeClam {
    init(options?: ClamScanOptions): Promise<NodeClam>;
    scanStream(stream: NodeJS.ReadableStream): Promise<ScanResult>;
    scanFile(filePath: string): Promise<ScanResult>;
    scanDir(dirPath: string): Promise<ScanResult>;
    isInfected(filePath: string): Promise<ScanResult>;
  }

  export default NodeClam;
}
