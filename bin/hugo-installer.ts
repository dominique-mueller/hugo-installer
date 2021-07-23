#!/usr/bin/env node

import * as fs from 'fs';
import objectPath from 'object-path';
import * as os from 'os';
import * as path from 'path';
import semver from 'semver';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Note:
// Native ESM in NodeJS requires a file extension to be present when doing relative imports, with an experimental flag as a workaround.
// TypeScript, however, will not add any file extension (made sense so far), and won't do so in the future in order to avoid rewriting code.
// Thus, we add the file extension on our own, and TypeScript seems to continue working just fine.
// TODO: Create a fancy rollup plugin that does this?
import { installHugo } from '../index.js';
import { InstallHugoOptions } from '../src/install-hugo.interfaces.js';

// Read CLI parameters
const argv = yargs(hideBin(process.argv))
  .version(false) // Disable default version flag (we're using our own in the next line)
  .option('arch', {
    choices: ['arm', 'arm64', 'x64', 'x86'],
    default: os.arch(),
    describe: 'System architecture that the binary will run on. It is recommended to use auto-detect by not using this option.',
  })
  .option('destination', {
    default: 'bin/hugo',
    describe: 'Path to the folder into which the binary will be put. Make sure to add this path to your "gitignore" file.',
    type: 'string',
  })
  .option('downloadUrl', {
    default: 'https://github.com/gohugoio/hugo/releases/download/',
    describe:
      'Source base URL from where the Hugo binary will be fetched. By default, GitHub will be used. When using a custom URL, make sure to replicate GitHub release asset URLs and append a trailing slash to the custom URL.',
    type: 'string',
  })
  .option('extended', {
    default: false,
    describe: 'Download the extended version of Hugo.',
    type: 'boolean',
  })
  .option('force', {
    default: false,
    describe: 'Force clean install of Hugo, ignoring already installed / cached binaries.',
    type: 'boolean',
  })
  .option('httpProxy', {
    default: process.env.HTTP_PROXY || null,
    describe:
      'HTTP Proxy URL, used when downloading Hugo binaries. Useful when working behind corporate proxies. Can also be configured using the "HTTP_PROXY" environment variable, the CLI argument (if used) will take precedence.',
    type: 'string',
  })
  .option('httpsProxy', {
    default: process.env.HTTPS_PROXY || null,
    describe:
      'HTTPS Proxy URL, used when downloading Hugo binaries. Useful when working behind corporate proxies. Can also be configured using the "HTTPS_PROXY" environment variable, the CLI argument (if used) will take precedence.',
    type: 'string',
  })
  .option('os', {
    choices: ['darwin', 'freebsd', 'linux', 'openbsd', 'win32'],
    default: os.platform(),
    describe: 'Operating system that the binary should run on. It is recommended to use auto-detect by not using this option.',
  })
  .option('skipChecksumCheck', {
    default: false,
    describe: 'Skip checksum checks for downloaded binaries. It is recommended to leave this option enabled.',
    type: 'boolean',
  })
  .option('skipHealthCheck', {
    default: false,
    describe: 'Skip health checks for downloaded binaries. It is recommended to leave this option enabled.',
    type: 'boolean',
  })
  .option('version', {
    describe:
      'Hugo version to install, or path to package.json entry with the version. Make sure to use the exact version number as defined in the official Hugo GitHub releases.',
    type: 'string',
    required: true,
  })
  .strict().argv;

/**
 * Bin
 */
const bin = async (options: InstallHugoOptions): Promise<void> => {
  // If the version does not have the format of a version number, assume it's an object path
  if (semver.valid(argv.version) === null) {
    // Read and parse package.json file
    let packageJsonContent: any;
    try {
      const packageJsonRaw = await fs.promises.readFile(path.resolve(process.cwd(), 'package.json'), { encoding: 'utf-8' });
      packageJsonContent = JSON.parse(packageJsonRaw);
    } catch (error) {
      console.error(`The version points to a property in the "package.json" file, but the file cannot be read. Details: ${error.message}`);
      process.exit(1);
    }

    // Try to get the version from the package.json file
    const packageJsonHugoVersion: string | null = objectPath.get(packageJsonContent, argv.version, null);
    if (packageJsonHugoVersion === null) {
      console.error(`The version points to a property in the "package.json" file, but the property does not exist.`);
      process.exit(1);
    }
    if (semver.valid(packageJsonHugoVersion) === null) {
      console.error('The version points to a property in the "package.json" file, but the version defined there is not valid.');
      process.exit(1);
    }

    options.version = packageJsonHugoVersion;
  }

  // Run
  installHugo(options)
    .then(() => {
      console.log('Success!');
      process.exit();
    })
    .catch((error: any) => {
      console.log(error);
      process.exit(1);
    });
};

// Run
bin({
  arch: argv.arch,
  destination: argv.destination,
  downloadUrl: argv.downloadUrl,
  extended: argv.extended,
  force: argv.force,
  httpProxy: argv.httpProxy,
  httpsProxy: argv.httpsProxy,
  os: argv.os,
  skipChecksumCheck: argv.skipChecksumCheck,
  skipHealthCheck: argv.skipHealthCheck,
  version: argv.version,
});
