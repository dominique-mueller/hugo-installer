import { spawn } from 'child_process';
import * as crypto from 'crypto';
import decompress from 'decompress';
import del from 'del';
import * as fs from 'fs';
import got, { OptionsOfTextResponseBody } from 'got';
import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent';
import * as path from 'path';
import semver from 'semver';

import hugoReleasesMeta from './../generated/hugo-releases-meta.json';
import { InstallHugoOptions } from './install-hugo.interfaces';

/**
 * Create fetch options
 */
const createFetchOptions = ({
  httpProxy,
  httpsProxy,
}: Pick<InstallHugoOptions, 'httpProxy' | 'httpsProxy'>): OptionsOfTextResponseBody | undefined => {
  return {
    agent: {
      ...(httpProxy === null
        ? {}
        : {
            http: new HttpProxyAgent({
              proxy: httpProxy,
            }),
          }),
      ...(httpsProxy === null
        ? {}
        : {
            https: new HttpsProxyAgent({
              proxy: httpsProxy,
            }),
          }),
    },
  };
};

/**
 * Clenaup and prepare destination
 */
const cleanupAndPrepareDestination = async ({ destination }: Pick<InstallHugoOptions, 'destination'>): Promise<void> => {
  // Delete destination folder with all its content
  await del(path.join(destination, '**'));

  // Prepare destination directory (does nothing if it already exists)
  await fs.promises.mkdir(destination, { recursive: true });
};

/**
 * Fetch binary
 */
const fetchBinary = async ({
  arch,
  downloadUrl,
  extended,
  httpProxy,
  httpsProxy,
  os,
  version,
}: Pick<InstallHugoOptions, 'arch' | 'downloadUrl' | 'extended' | 'httpProxy' | 'httpsProxy' | 'os' | 'version'>): Promise<{
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

  // Construct binary file name and URL
  const binaryFileName = binaryFileNamePattern.fileNamePattern
    .replace('{{variant}}', extended ? 'hugo_extended' : 'hugo')
    .replace('{{version}}', version);
  const binaryUrl = new URL(`v${version}/${binaryFileName}`, downloadUrl).toString();

  // Download binary
  console.log(`> Downloading binary from "${binaryUrl}"`);
  let binaryAsBuffer: Buffer;
  try {
    const binaryResponse = await got(binaryUrl, createFetchOptions({ httpProxy, httpsProxy }));
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
  {
    downloadUrl,
    extended,
    httpProxy,
    httpsProxy,
    version,
  }: Pick<InstallHugoOptions, 'downloadUrl' | 'extended' | 'httpProxy' | 'httpsProxy' | 'version'>,
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
    const checksumResponse = await got(checksumUrl, createFetchOptions({ httpProxy, httpsProxy }));
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
 * Write binary to disk
 */
const writeBinaryToDisk = async (binaryAsBuffer, { destination }: Pick<InstallHugoOptions, 'destination'>): Promise<void> => {
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
const verifyBinaryHealth = async ({ destination }: Pick<InstallHugoOptions, 'destination'>): Promise<string> => {
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
 * Generate and write version to disk
 */
const generateAndWriteVersionToDisk = async ({
  arch,
  destination,
  extended,
  os,
  version,
}: Pick<InstallHugoOptions, 'arch' | 'destination' | 'extended' | 'os' | 'version'>): Promise<void> => {
  const versionFileContent = {
    arch,
    extended,
    os,
    version,
  };
  await fs.promises.writeFile(path.join(destination, 'version.json'), JSON.stringify(versionFileContent, null, '  '));
};

/**
 * Check for existing binary
 */
const checkForExistingBinary = async ({
  arch,
  destination,
  extended,
  os,
  version,
}: Pick<InstallHugoOptions, 'arch' | 'destination' | 'extended' | 'os' | 'version'>): Promise<boolean> => {
  console.log('> Checking for existing binary');

  try {
    // Try to read and parse version file
    const versionFileContentRaw = await fs.promises.readFile(path.join(destination, 'version.json'), { encoding: 'utf-8' });
    const versionFileContent = JSON.parse(versionFileContentRaw);

    // Check if the existing binary is the one we need anyways
    const doesBinaryAlreadyExist =
      versionFileContent.arch === arch &&
      versionFileContent.extended === extended &&
      versionFileContent.os === os &&
      versionFileContent.version === version;

    if (doesBinaryAlreadyExist) {
      console.log('  Binary already exists!');
    }

    return doesBinaryAlreadyExist;
  } catch (error) {
    return false;
  }
};

/**
 * Install hugo binary
 */
export async function installHugo({
  arch,
  downloadUrl,
  destination,
  extended,
  force,
  httpProxy,
  httpsProxy,
  os,
  skipChecksumCheck,
  skipHealthCheck,
  version,
}: InstallHugoOptions): Promise<void> {
  // Start log
  console.log('');
  console.log('Hugo Installer');
  console.log('');

  // Check for existing binary
  const doesBinaryAlreadyExist = force
    ? false
    : await checkForExistingBinary({
        arch,
        destination,
        extended,
        os,
        version,
      });

  // Cleanup and download binary
  if (!doesBinaryAlreadyExist) {
    await cleanupAndPrepareDestination({ destination });
    const { binaryAsBuffer, binaryFileName } = await fetchBinary({ arch, downloadUrl, extended, httpProxy, httpsProxy, os, version });
    if (!skipChecksumCheck) {
      await verifyBinaryChecksum(binaryAsBuffer, binaryFileName, { downloadUrl, extended, httpProxy, httpsProxy, version });
    }
    await writeBinaryToDisk(binaryAsBuffer, { destination });
  }

  // Run health check (even if it already existed)
  let versionOutput = null;
  if (!skipHealthCheck) {
    versionOutput = await verifyBinaryHealth({ destination });
  }

  // Write version info to disk
  await generateAndWriteVersionToDisk({
    arch,
    destination,
    extended,
    os,
    version,
  });

  // End log
  console.log('');
  console.log(`Hugo is now available in "${destination}".`);
  console.log('');
  console.log(`- Version       ${version}`);
  console.log(`- Extended      ${extended ? 'Yes' : 'No'}`);
  console.log(`- OS            ${os}`);
  console.log(`- Architecture  ${arch}`);
  if (versionOutput) {
    console.log('');
    console.log(versionOutput);
  }
  console.log('');
}
