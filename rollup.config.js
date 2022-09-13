import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import bundleSize from 'rollup-plugin-bundle-size';
import externals from 'rollup-plugin-node-externals';
import typescript from 'rollup-plugin-typescript2';
import { preserveShebangs } from 'rollup-plugin-preserve-shebangs';

/**
 * Rollup configuration
 */
export default [
  // "src"
  {
    input: 'index.ts',
    plugins: [
      externals({
        builtins: true,
        deps: true,
        devDeps: true,
        peerDeps: true,
        optDeps: true,
      }),
      typescript(),
      json({
        preferConst: true,
      }),
      resolve(),
      commonjs(),
      bundleSize(),
    ],
    output: [
      {
        file: 'dist/index.js',
        format: 'es',
        sourcemap: true,
      },
    ],
  },

  // "bin"
  {
    input: 'bin/hugo-installer.ts',
    external: ['../index.js'],
    plugins: [
      externals({
        builtins: true,
        deps: true,
        devDeps: true,
        peerDeps: true,
        optDeps: true,
      }),
      typescript({
        tsconfigOverride: {
          compilerOptions: {
            declaration: false,
          },
        },
      }),
      json({
        preferConst: true,
      }),
      resolve(),
      commonjs(),
      preserveShebangs(),
      bundleSize(),
    ],
    output: [
      {
        file: 'dist/bin/hugo-installer.js',
        format: 'es',
      },
    ],
  },
];
