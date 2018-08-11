import * as path from 'path';

import * as BinWrapper from 'bin-wrapper';

/**
 * Install hugo binary
 *
 * @param version     - Version
 * @param destination - Binary destination
 */
export async function installHugo( version: string, destination: string ): Promise<void> {

    // Configure
    const githubReleaseUrl: string = `https://github.com/gohugoio/hugo/releases/download/v${ version }/`;
    const binaryNameLinux: string = `hugo_${ version }_Linux-64bit.tar.gz`;
    const binaryNameWindows: string = `hugo_${ version }_Windows-64bit.zip`;

    // Setup and download
    await new BinWrapper()
        .src( `${ githubReleaseUrl }${ binaryNameLinux }`, 'linux', 'x64' )
        .src( `${ githubReleaseUrl }${ binaryNameWindows }`, 'win32', 'x64' )
        .dest( path.resolve( process.cwd(), destination ) )
        .download();

}
