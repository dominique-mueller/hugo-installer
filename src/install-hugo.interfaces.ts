/**
 * Install hugo options
 */
export interface InstallHugoOptions {
  arch: string;
  destination: string;
  downloadUrl: string;
  extended: boolean;
  force: boolean;
  httpProxy: string | null;
  httpsProxy: string | null;
  os: string;
  skipChecksumCheck: boolean;
  skipHealthCheck: boolean;
  version: string;
}
