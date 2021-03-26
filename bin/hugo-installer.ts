#!/usr/bin/env node

import * as objectPath from 'object-path';
import * as path from 'path';
import * as yargs from 'yargs';

import { installHugo } from '../index';

// Read CLI parameters
const argv: { [param: string]: any } = yargs
  .version(false) // Disable default version flag (we're using our own in the next line)
  .option('version', {
    describe: 'Hugo version to install, or path to package.json value with the version',
    type: 'string',
    required: true,
  })
  .option('destination', {
    describe: 'Destination to download the Hugo binary into',
    type: 'string',
    default: 'bin/hugo',
  })
  .option('extended', {
    describe: 'Download Hugo extended',
    type: 'boolean',
    default: false,
  })
  .strict().argv;

// If the version does not have the format of a version number, assume it's an object path
if (isNaN(parseFloat(argv.version))) {
  // Note: No is no other way in NodeJS to dynamically resolve and import the project's package.json file
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const packageJson: any = require(path.resolve(process.cwd(), 'package.json'));
  const packageJsonHugoVersion: string | null = objectPath.get(packageJson, argv.version, null);
  if (!packageJsonHugoVersion) {
    console.error(`Cannot find a hugo version in the package.json file at "${argv.version}"`);
    process.exit(1);
  }
  argv.version = packageJsonHugoVersion;
}

// Run
const versionString = `${argv.version}${argv.extended ? '_extended' : ''}`;
console.log(`Download hugo binary (version "${versionString}") into "${argv.destination}" ...`);
installHugo(argv.version, argv.destination)
  .then(() => {
    console.log('Success!');
    process.exit();
  })
  .catch((error: any) => {
    console.error('Error!');
    if (error.toString().indexOf('404') !== -1) {
      console.error(`  -> It seems like the hugo version "${versionString}" does not exist.`);
    }
    console.log('');
    console.dir(error);
    process.exit(1);
  });
