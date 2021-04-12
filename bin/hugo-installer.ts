#!/usr/bin/env node

import objectPath from 'object-path';
import * as os from 'os';
import * as path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Note:
// Native ESM in NodeJS requires a file extension to be present when doing relative imports, with an experimental flag as a workaround.
// TypeScript, however, will not add any file extension (made sense so far), and won't do so in the future in order to avoid rewriting code.
// Thus, we add the file extension on our own, and TypeScript seems to continue working just fine.
// TODO: Create a fancy rollup plugin that does this?
import { installHugo } from '../index.js';

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

// If the version does not have the format of a version number, assume it's an object path
if (isNaN(parseFloat(argv.version))) {
  // Note: There is no other way in NodeJS to dynamically resolve and import the project's package.json file
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const packageJson: any = require(path.resolve(process.cwd(), 'package.json'));
  const packageJsonHugoVersion: string | null = objectPath.get(packageJson, argv.version, null);
  if (!packageJsonHugoVersion) {
    console.error(`The version "${argv.version}" is either invalid or not part of the "package.json" file.`);
    process.exit(1);
  }
  argv.version = packageJsonHugoVersion;
}

// Run
installHugo({
  arch: argv.arch,
  downloadUrl: argv.downloadUrl,
  destination: argv.destination,
  extended: argv.extended,
  force: argv.force,
  os: argv.os,
  skipChecksumCheck: argv.skipChecksumCheck,
  skipHealthCheck: argv.skipHealthCheck,
  version: argv.version,
})
  .then(() => {
    console.log('Success!');
    process.exit();
  })
  .catch((error: any) => {
    console.log(error);
    process.exit(1);
  });
