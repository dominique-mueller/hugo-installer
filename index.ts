import { spawn } from 'child_process';
import * as crypto from 'crypto';
import decompress from 'decompress';
import del from 'del';
import * as fs from 'fs';
import got from 'got';
import * as path from 'path';
import semver from 'semver';

import hugoReleasesMeta from './generated/hugo-releases-meta.json';

/**
 * Install hugo params
 */
export interface InstallHugoParams {
  arch: string;
  downloadUrl: string;
  destination: string;
  extended: boolean;
  os: string;
  skipChecksumCheck: boolean;
  skipHealthCheck: boolean;
  version: string;
}

/**
 * Clenaup and prepare destination
 */
const cleanupAndPrepareDestination = async ({ destination }: Pick<InstallHugoParams, 'destination'>): Promise<void> => {
  // Delete destination folder with all its content
  await del(path.join(destination, '**'));

  // Prepare destination directory (does nothing if it already exists)
  await fs.promises.mkdir(destination, { recursive: true });
};

/**
 * Fetch hugo binary
 */
const fetchHugoBinary = async ({
  arch,
  downloadUrl,
  extended,
  os,
  version,
}: Pick<InstallHugoParams, 'arch' | 'downloadUrl' | 'extended' | 'os' | 'version'>): Promise<{
  binaryAsBuffer: Buffer;
  binaryFileName: string;
}> => {
  // Find hugo binary release meta for the given os-arch combination
  const binaryMeta =
    hugoReleasesMeta.binaries.find((binary): boolean => {
      return binary.arch === arch && binary.os === os;
    }) || null;
  if (binaryMeta === null) {
    throw new Error(
      `A hugo release for os="${os}" and arch="${arch}" is not known to "hugo-installer". If you think this is a bug, feel free to open a GitHub issue here: https://github.com/dominique-mueller/hugo-installer/issues/new.`,
    );
  }

  // Find binary file pattern for the given version
  const binaryFileNamePattern = binaryMeta.fileNamePatternHistory.reverse().reduce((fileNamePattern, fileNamePatternHistoryItem) => {
    return semver.gte(semver.coerce(version), semver.coerce(fileNamePatternHistoryItem.version))
      ? fileNamePatternHistoryItem
      : fileNamePattern;
  }, null);
  if (binaryFileNamePattern === null || binaryFileNamePattern.fileNamePattern === null) {
    throw new Error(
      `A Hugo binary file for version="${version}"${
        extended ? ' (extended)' : ''
      }, os="${os}" and arch="${arch}" is not known to "hugo-installer". If you think this is a bug, feel free to open a GitHub issue here: https://github.com/dominique-mueller/hugo-installer/issues/new.`,
    );
  }

  // Contruct binary file name and URL
  const binaryFileName = binaryFileNamePattern.fileNamePattern
    .replace('{{variant}}', extended ? 'hugo_extended' : 'hugo')
    .replace('{{version}}', version);
  const binaryUrl = new URL(`v${version}/${binaryFileName}`, downloadUrl).toString();

  // Download binary
  console.log(`> Downloading binary from "${binaryUrl}"`);
  let binaryAsBuffer: Buffer;
  try {
    const binaryResponse = await got(binaryUrl);
    binaryAsBuffer = binaryResponse.rawBody;
  } catch (error) {
    throw new Error(`An error occured while trying to download the binary from "${binaryUrl}". Details: ${error.message}`);
  }

  // Done
  return {
    binaryAsBuffer,
    binaryFileName,
  };
};

/**
 * Verify binary checksum
 */
const verifyBinaryChecksum = async (
  binaryAsBuffer: Buffer,
  binaryFileName: string,
  { downloadUrl, extended, version }: Pick<InstallHugoParams, 'downloadUrl' | 'extended' | 'version'>,
): Promise<void> => {
  // Find checksum file pattern
  const checksumFileNamePattern = hugoReleasesMeta.checksumFilePatternHistory
    .reverse()
    .reduce((fileNamePattern, fileNamePatternHistoryItem) => {
      return semver.gte(semver.coerce(version), semver.coerce(fileNamePatternHistoryItem.version))
        ? fileNamePatternHistoryItem
        : fileNamePattern;
    }, null);
  if (checksumFileNamePattern == null || checksumFileNamePattern.fileNamePattern === null) {
    throw new Error(
      `A Hugo checksum file for version="${version}"${
        extended ? ' (extended)' : ''
      } is not known to "hugo-installer". If you think this is a bug, feel free to open a GitHub issue here: https://github.com/dominique-mueller/hugo-installer/issues/new.`,
    );
  }

  // Construct checksum file name and url
  const checksumFileName = checksumFileNamePattern.fileNamePattern
    .replace('{{variant}}', extended && checksumFileNamePattern.useSpecificVariant ? 'hugo_extended' : 'hugo')
    .replace('{{version}}', version);
  const checksumUrl = new URL(`v${version}/${checksumFileName}`, downloadUrl).toString();

  console.log(`> Downloading checksum from "${checksumUrl}"`);

  // Download checksum
  let rawChecksums: string;
  try {
    const checksumResponse = await got(checksumUrl);
    rawChecksums = checksumResponse.body;
  } catch (error) {
    throw new Error(`An error occured while trying to download the checksum. Details: ${error.message}`);
  }

  // Find expected checksum
  const rawChecksumLine =
    rawChecksums.split('\n').find((rawChecksumLine) => {
      return rawChecksumLine.endsWith(binaryFileName);
    }) || null;
  if (rawChecksumLine === null) {
    throw new Error(`An error occured while trying to find the checksum for version "${version}" the checksum.`);
  }
  const expectedChecksum = rawChecksumLine.split(' ')[0];

  // Generate actual checksum from downloaded binary
  const actualChecksum = crypto.createHash('sha256').update(binaryAsBuffer).digest('hex');

  console.log(`> Verifying binary checksum`);

  // Verify checksum
  if (actualChecksum !== expectedChecksum) {
    throw new Error(`The binary file could not be verified by its checksum. Expected: "${expectedChecksum}". Actual: "${actualChecksum}"`);
  }
};

/**
 * Write hugo binary to disk
 */
const writeHugoBinaryToDisk = async (binaryAsBuffer, { destination }: Pick<InstallHugoParams, 'destination'>): Promise<void> => {
  console.log(`> Extracting binary to disk`);

  // Decompress and write package to disk
  const decompressedFiles = await decompress(binaryAsBuffer, destination);

  // Apply file permissions
  await Promise.all(
    decompressedFiles.map((decompressedFile) => {
      return fs.promises.chmod(path.join(destination, decompressedFile.path), 0o755);
    }),
  );
};

/**
 * Verify binary health
 */
const verifyBinaryHealth = async ({ destination }: Pick<InstallHugoParams, 'destination'>): Promise<string> => {
  console.log(`> Verifying binary health`);

  return new Promise<string>((resolve, reject): void => {
    let hugoVersionConsoleOutput = null;
    const childProcess = spawn(path.join(destination, 'hugo'), ['version']);
    childProcess.stdout.on('data', (data) => {
      hugoVersionConsoleOutput = data.toString().replace(/\r?\n|\r/g, '');
    });
    childProcess.on('close', () => {
      resolve(hugoVersionConsoleOutput);
    });
    childProcess.on('error', (error) => {
      reject(`An error occured while verifiy the binary health. Details: ${error.message}`);
    });
  });
};

/**
 * Install hugo binary
 */
export async function installHugo({
  arch,
  downloadUrl,
  destination,
  extended,
  os,
  skipChecksumCheck,
  skipHealthCheck,
  version,
}: InstallHugoParams): Promise<void> {
  console.log('');
  console.log('Installing Hugo');
  console.log('');

  // TODO: Check version file on disk & --force-install param

  await cleanupAndPrepareDestination({ destination });
  const { binaryAsBuffer, binaryFileName } = await fetchHugoBinary({ arch, downloadUrl, extended, os, version });
  if (!skipChecksumCheck) {
    await verifyBinaryChecksum(binaryAsBuffer, binaryFileName, { downloadUrl, extended, version });
  }
  await writeHugoBinaryToDisk(binaryAsBuffer, { destination });

  // Check
  let versionOutput = null;
  if (!skipHealthCheck) {
    versionOutput = await verifyBinaryHealth({ destination });
  }

  // TODO: Write version file to disk

  console.log('');
  console.log(`Hugo has been downloaded into "${destination}".`);
  console.log('');
  console.log(`- Version: ${version}`);
  console.log(`- Extended version: ${extended ? 'Yes' : 'No'}`);
  console.log(`- Operating system: ${os}`);
  console.log(`- System architecture: ${arch}`);
  if (versionOutput) {
    console.log('');
    console.log(versionOutput);
  }
  console.log('');
}
