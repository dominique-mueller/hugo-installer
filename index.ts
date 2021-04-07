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

  // Find hugo binary release meta
  const binaryMeta = hugoReleasesMeta.binaries.find((binary) => {
    return binary.arch === arch && binary.os === os;
  });
  if (binaryMeta === undefined) {
    throw new Error(`A release for os="${os}" and arch="${arch}" either does not exist or cannot be found.`);
  }

  // Find binary file pattern for the given version
  const binaryFileNamePattern = binaryMeta.fileNamePatternHistory.reverse().reduce((fileNamePattern, fileNamePatternHistoryItem) => {
    if (semver.gte(semver.coerce(version), semver.coerce(fileNamePatternHistoryItem.version))) {
      return fileNamePatternHistoryItem;
    }
    return fileNamePattern;
  }, null);
  if (binaryFileNamePattern.fileNamePattern === null) {
    throw new Error(
      `A release binary file with version="${version}" for os="${os}" and arch="${arch}" either does not exist or cannot be found.`,
    );
  }

  // Contruct binary URL
  const binaryFileName = binaryFileNamePattern.fileNamePattern
    .replace('{{variant}}', extended ? 'hugo_extended' : 'hugo')
    .replace('{{version}}', version);
  const binaryUrl = new URL(`v${version}/${binaryFileName}`, downloadUrl).toString();

  // Clear destination folder upfront
  await del(path.join(destination, '**'));

  // Prepare destination directory (if necessary)
  await fs.promises.mkdir(destination, { recursive: true });

  // Download binary
  console.log(`> Downloading binary from "${binaryUrl}"`);
  let binaryFileBuffer;
  try {
    const binaryResponse = await got(binaryUrl);
    binaryFileBuffer = binaryResponse.rawBody;
  } catch (error) {
    throw new Error(`An error occured while trying to download the binary. Details: ${error.message}`);
  }

  if (!skipChecksumCheck) {
    // Find checksum file pattern
    const checksumFileNamePattern = hugoReleasesMeta.checksumFilePatternHistory
      .reverse()
      .reduce((fileNamePattern, fileNamePatternHistoryItem) => {
        if (semver.gte(semver.coerce(version), semver.coerce(fileNamePatternHistoryItem.version))) {
          return fileNamePatternHistoryItem;
        }
        return fileNamePattern;
      }, null);
    if (checksumFileNamePattern.fileNamePattern !== null) {
      // Construct checksum URL
      const checksumFileName = checksumFileNamePattern.fileNamePattern
        .replace('{{variant}}', extended && checksumFileNamePattern.useSpecificVariant ? 'hugo_extended' : 'hugo')
        .replace('{{version}}', version);
      const checksumUrl = new URL(`v${version}/${checksumFileName}`, downloadUrl).toString();

      // Download checksums
      console.log(`> Downloading checksum from "${checksumUrl}"`);
      let checksums;
      try {
        const checksumResponse = await got(checksumUrl);
        checksums = checksumResponse.body;
      } catch (error) {
        throw new Error(`An error occured while trying to download the checksum. Details: ${error.message}`);
      }

      // Find checksum
      const checksum = checksums.split('\n').find((checksum) => {
        return checksum.endsWith(binaryFileName);
      });
      if (checksum === undefined) {
        throw new Error('An error occured while trying to find the checksum.');
      }
      const expectedChecksum = checksum.split(' ')[0];

      // Verify checksum
      console.log(`> Verifying binary checksum`);
      const actualChecksum = crypto.createHash('sha256').update(binaryFileBuffer).digest('hex');
      if (actualChecksum !== expectedChecksum) {
        throw new Error('The binary file could not be verified by its checksum.');
      }
    }
  }

  // Extract to disk
  console.log(`> Extracting binary to disk`);
  const decompressedFiles = await decompress(binaryFileBuffer, destination);
  await Promise.all(
    decompressedFiles.map((decompressedFile) => {
      return fs.promises.chmod(path.join(destination, decompressedFile.path), 0o755);
    }),
  );

  // Check
  let versionOutput = null;
  if (!skipHealthCheck) {
    console.log(`> Verifying binary health`);
    versionOutput = await new Promise<string>((resolve, reject) => {
      let versionOutput = null;
      const childProcess = spawn(path.join(destination, 'hugo'), ['version']);
      childProcess.stdout.on('data', (data) => {
        versionOutput = data.toString().replace(/\r?\n|\r/g, '');
      });
      childProcess.on('close', () => {
        resolve(versionOutput);
      });
      childProcess.on('error', (error) => {
        reject(`An error occured while verifiy Hugo binary health. Details: ${error.message}`);
      });
    });
  }

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
