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

    // Clear destination folder upfront
    await del( path.join( destinationPath, '**' ) );

    // Setup and download
    await new BinWrapper()

        // Windows
        .src( `${ githubReleaseUrl }hugo_${ version }_Windows-64bit.zip`, 'win32', 'x64' )
        .src( `${ githubReleaseUrl }hugo_${ version }_Windows-32bit.zip`, 'win32', 'x86' )

        // Linux
        .src( `${ githubReleaseUrl }hugo_${ version }_Linux-64bit.tar.gz`, 'linux', 'x64' )
        .src( `${ githubReleaseUrl }hugo_${ version }_Linux-32bit.tar.gz`, 'linux', 'x86' )

        // MacOS
        .src( `${ githubReleaseUrl }hugo_${ version }_macOS-64bit.tar.gz`, 'darwin', 'x64' )
        .src( `${ githubReleaseUrl }hugo_${ version }_macOS-32bit.tar.gz`, 'darwin', 'x86' )

        // Download
        .dest( destinationPath )
        .download();

}
