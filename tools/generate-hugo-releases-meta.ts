import { promises as fs } from 'fs';
import * as path from 'path';

import got from 'got';

import archFileNamePatterns from './file-name-patterns-arch.json' assert { type: 'json' };
import osFileNamePatterns from './file-name-patterns-os.json' assert { type: 'json' };
import combinationsOsArch from './combinations-os-arch.json' assert { type: 'json' };

/**
 * Fetch Hugo releases, paginated (max page size = 100)
 */
const fetchReleasesPaginated = () => {
  const githubToken: string | undefined = process.env.GH_TOKEN;
  return got.paginate({
    url: 'https://api.github.com/repos/gohugoio/hugo/releases?per_page=100&page=1',
    headers: {
      Accept: 'application/vnd.github.v3+json',
      ...(githubToken && {
        Authorization: `token ${githubToken}`,
      }),
    },
  });
};

/**
 * Main
 */
const main = async () => {
  // Start
  console.log('GENERATE HUGO RELEASES META');
  console.log('');

  // Fetch all Hugo releases
  console.log('> Fetching Hugo release information from GitHub ...');
  let releases = [];
  for await (const partialReleases of fetchReleasesPaginated()) {
    releases.push(partialReleases);
  }

  // Figure out binary meta
  console.log('> Analyzing Hugo release binaries ...');
  const binaries = combinationsOsArch.map((combinationOsArch) => {
    return {
      ...combinationOsArch,
      fileNamePatternHistory: []
        .concat(
          ...releases.map((release: any) => {
            // Get clean release version
            // Note: We use the "tag_name" instead of "name" cause "name" seems to be missing on a few older releases
            const version = release.tag_name.replace('v', '');

            // Get asset file name patterns
            const fileNamePatterns: Array<string> = release.assets
              // We only care about the name
              .map((asset: any): string => {
                return asset.name;
              })

              // Find assets matching the given os-arch combination
              .filter((assetName: string): boolean => {
                return (
                  assetName.match(new RegExp(osFileNamePatterns[combinationOsArch.os], 'gi')) !== null &&
                  assetName.match(new RegExp(archFileNamePatterns[combinationOsArch.arch], 'gi')) !== null
                );
              })

              // Map from specific asset name to generic asset name with placeholders
              .map((assetName: string): string => {
                return assetName.replace('hugo_extended', '{{variant}}').replace('hugo', '{{variant}}').replace(version, '{{version}}');
              })

              // Some release binaries exist in multiple formats, so we ignore ".deb" files
              .filter((assetName: string): boolean => {
                return !assetName.endsWith('.deb');
              });
            const fileNamePatternsDeduplicated = [...new Set(fileNamePatterns)];

            // Return asset info
            return {
              version: version,
              fileNamePattern: fileNamePatternsDeduplicated[0] || null, // "null" means no pattern was found, aka no binary exists
            };
          }),
        )

        // Starting with the oldest release, figure out changes to binary file name patterns
        .reverse()
        .reduce((allVersions, currentVersion) => {
          // If the file name pattern has changed or none exists yet, add it
          if (allVersions.length === 0 || allVersions[0].fileNamePattern !== currentVersion.fileNamePattern) {
            allVersions.unshift(currentVersion);
          }
          return allVersions;
        }, []),
    };
  });

  // Figure out checksum meta
  console.log('> Analyzing Hugo release checksums ...');
  const checksumFilePatternHistory = []
    .concat(
      ...releases.map((release: any) => {
        // Get clean release version
        // Note: We use the "tag_name" instead of "name" cause "name" seems to be missing on a few older releases
        const version = release.tag_name.replace('v', '');

        // Get asset file name patterns
        const fileNamePatterns: Array<string> = release.assets
          // We only care about the name
          .map((asset: any): string => {
            return asset.name;
          })

          // Find assets matching the given os-arch combination
          .filter((assetName: string): boolean => {
            return assetName.match(/checksums/gi) !== null;
          })

          // Map from specific asset name to generic asset name with placeholders
          .map((assetName: string): string => {
            return assetName.replace('hugo_extended', '{{variant}}').replace('hugo', '{{variant}}').replace(version, '{{version}}');
          });
        const fileNamePatternsDeduplicated = [...new Set(fileNamePatterns)];

        // Return asset info
        return {
          version: version,
          fileNamePattern: fileNamePatternsDeduplicated[0] || null, // "null" means no pattern was found, aka no checksum exists
          useSpecificVariant: fileNamePatterns.length > 1,
        };
      }),
    )

    // Starting with the oldest release, figure out changes to checksum file name patterns
    .reverse()
    .reduce((allVersions, currentVersion) => {
      // If the file name pattern has changed or none exists yet, add it
      if (
        allVersions.length === 0 ||
        allVersions[0].fileNamePattern !== currentVersion.fileNamePattern ||
        allVersions[0].useSpecificVariant !== currentVersion.useSpecificVariant
      ) {
        allVersions.unshift(currentVersion);
      }
      return allVersions;
    }, []);

  // Write results to disk
  console.log('> Writing hugo release meta to disk ...');
  const hugoReleaseMeta = {
    binaries,
    checksumFilePatternHistory,
  };
  await fs.writeFile(path.join(process.cwd(), 'generated', 'hugo-releases-meta.json'), JSON.stringify(hugoReleaseMeta, null, '  '));

  // Done
  console.log('');
  console.log('DONE');
};

main();
