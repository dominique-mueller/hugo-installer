#!/usr/bin/env node

import * as yargs from 'yargs';

import { installHugo } from '../index';

// Read CLI parameters
const argv: any = yargs
    .version( false ) // Disable default version flag (we're using our own in the next line)
    .option( 'version', {
        describe: 'Hugo version to install',
        type: 'string',
        required: true
    } )
    .option( 'destination', {
        describe: 'Destination to download the Hugo binary into',
        type: 'string',
        default: 'bin/hugo'
    } )
    .strict()
    .argv;

// Run
console.log( `Install hugo v${ argv.version } into "${ argv.destination }"...` );
installHugo( argv.version, argv.destination )
    .then( () => {
        console.log( 'Success!' );
    } )
    .catch( ( error: any ) => {
        console.error( 'Error!', error );
    } );
