import * as path from 'path';

import * as BinWrapper from 'bin-wrapper';
import * as del from 'del';

/**
 * Install hugo binary
 *
 * @param version     - Version
 * @param destination - Binary destination
 */
export async function installHugo( version: string, destination: string ): Promise<void> {

    // Configure
    const destinationPath: string = path.resolve( process.cwd(), destination );
    const githubReleaseUrl: string = `https://github.com/gohugoio/hugo/releases/download/v${ version }/`;
    const binaryNameLinux: string = `hugo_${ version }_Linux-64bit.tar.gz`;
    const binaryNameWindows: string = `hugo_${ version }_Windows-64bit.zip`;

    // Clear destination folder upfront
    await del( path.join( destinationPath, '**' ) );

    // Setup and download
    await new BinWrapper()
        .src( `${ githubReleaseUrl }${ binaryNameLinux }`, 'linux', 'x64' )
        .src( `${ githubReleaseUrl }${ binaryNameWindows }`, 'win32', 'x64' )
        .dest( destinationPath )
        .download();

}
