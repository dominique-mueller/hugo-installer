import * as yargs from 'yargs';

import { installHugo } from '../index';

// Read CLI parameters
const cliParameters: yargs.Argv = yargs
    .option( 'version', {
        describe: 'Hugo version to install',
        type: 'string',
        required: true
    } )
    .option( 'destination', {
        describe: 'Destination to download the Hugo binary into',
        type: 'string',
        default: 'bin'
    } )
    .strict();

// Run
console.log( `Install hugo v${ cliParameters.argv.version } into "${ cliParameters.argv.destination }"...` );
installHugo( cliParameters.argv.version, cliParameters.argv.destination )
    .then( () => {
        console.log( 'Success!' );
    } )
    .catch( ( error: any ) => {
        console.error( 'Error!', error );
    } );
