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
      resolve(),
      commonjs(),
      typescript(),
      json(),
      bundleSize(),
    ],
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/index.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
  },
  {
    input: 'bin/hugo-installer.ts',
    external: ['../index'],
    plugins: [
      externals({
        builtins: true,
        deps: true,
        devDeps: true,
        peerDeps: true,
        optDeps: true,
      }),
      resolve(),
      commonjs(),
      typescript({
        tsconfigOverride: {
          compilerOptions: {
            declaration: false,
          },
        },
      }),
      preserveShebangs(),
      bundleSize(),
    ],
    output: [
      {
        file: 'dist/bin/hugo-installer.js',
        format: 'cjs',
      },
    ],
  },
];
