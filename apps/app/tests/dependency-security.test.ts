import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../../..');
const lock = readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8');
// Only package records, never importer specifiers or peer-dependency snapshots.
const packages = lock.split('\npackages:\n')[1]?.split('\nsnapshots:\n')[0];
const records = [...(packages ?? '').matchAll(/^ {2}'?(.+)@(\d+\.\d+\.\d+)'?:$/gm)];

// WRE-90 maintainer advisory floors. These are a regression guard, not a
// replacement for a current registry audit or authenticated acceptance tests.
const floors: [string, number, string, string?][] = [
  ['next', 16, '16.3.4'],
  ['sharp', 0, '0.35.4'],
  ['deepmerge-ts', 8, '8.0.2'],
  ['postcss', 8, '8.5.23'],
  ['@babel/core', 7, '7.29.6'],
  ['@opentelemetry/core', 2, '2.8.0'],
  ['ajv', 6, '6.14.0'],
  ['body-parser', 2, '2.3.0'],
  ['qs', 6, '6.15.2'],
  ['serialize-javascript', 7, '7.0.5'],
  ['valibot', 1, '1.4.2'],
  ['yaml', 1, '1.10.3'],
  ['yaml', 2, '2.8.3'],
  ['@babel/plugin-transform-modules-systemjs', 7, '7.29.4'],
  ['@grpc/grpc-js', 1, '1.14.4'],
  ['@hono/node-server', 1, '1.19.15'],
  ['@opentelemetry/propagator-jaeger', 2, '2.9.0'],
  ['@xmldom/xmldom', 0, '0.8.13'],
  ['axios', 1, '1.16.0'],
  ['brace-expansion', 1, '1.1.18'],
  ['brace-expansion', 2, '2.1.4'],
  ['brace-expansion', 5, '5.0.9'],
  ['defu', 6, '6.1.5'],
  ['effect', 3, '3.20.0'],
  ['express-rate-limit', 8, '8.2.2'],
  ['fast-uri', 3, '3.1.5'],
  ['flatted', 3, '3.4.2'],
  ['form-data', 4, '4.0.6'],
  ['hono', 4, '4.12.34'],
  ['ip-address', 10, '10.3.1'],
  ['js-cookie', 3, '3.0.7'],
  ['js-yaml', 3, '3.15.1'],
  ['js-yaml', 4, '4.3.1'],
  ['lodash', 4, '4.18.1'],
  ['minimatch', 5, '5.1.8'],
  ['minimatch', 10, '10.2.3'],
  ['nanoid', 3, '3.3.18'],
  ['node-forge', 1, '1.4.0'],
  ['path-to-regexp', 8, '8.4.0'],
  ['picomatch', 2, '2.3.2'],
  ['picomatch', 4, '4.0.4'],
  // This regression was introduced in 10.28.0; older 10.x is not affected.
  ['preact', 10, '10.28.2', '10.28.0'],
  ['rollup', 2, '2.80.0'],
  ['rollup', 4, '4.59.0'],
  ['undici', 6, '6.28.0'],
  ['ws', 6, '6.2.4'],
  ['ws', 7, '7.5.11'],
  ['ws', 8, '8.21.0'],
  ['@clerk/nextjs', 6, '6.39.3'],
  ['@clerk/nextjs', 7, '7.2.4'],
  ['@clerk/backend', 2, '2.33.3'],
  ['@clerk/backend', 3, '3.2.14'],
  ['@clerk/shared', 3, '3.47.5'],
  ['@clerk/shared', 4, '4.8.3'],
  ['@clerk/clerk-react', 5, '5.61.6'],
  ['@clerk/react', 6, '6.4.3'],
  ['@clerk/clerk-js', 5, '5.125.10'],
  ['@clerk/clerk-expo', 2, '2.19.36'],
  ['protobufjs', 7, '7.6.5'],
  ['tar', 7, '7.5.21'],
  ['shell-quote', 1, '1.9.0'],
  ['vite', 6, '6.4.3'],
  ['vitest', 3, '3.2.7'],
  ['@vitest/ui', 3, '3.2.7'],
  ['@vitest/coverage-v8', 3, '3.2.7'],
  ['@vitest/coverage-istanbul', 3, '3.2.7'],
];

describe('security dependency floors', () => {
  it('reads the pnpm package records', () => {
    expect(packages).toBeTruthy();
    expect(records.length).toBeGreaterThan(100);
  });

  it.each(floors)('%s major %i is at least %s', (name, major, floor, introduced) => {
    const versions = records
      .filter(([, pkg, version]) => pkg === name && Number(version.split('.')[0]) === major)
      .map(([, , version]) => version);
    expect(versions.length, `${name}@${major} must remain covered`).toBeGreaterThan(0);
    for (const version of versions) {
      if (introduced && version.localeCompare(introduced, 'en', { numeric: true }) < 0) continue;
      expect(version.localeCompare(floor, 'en', { numeric: true }), version).toBeGreaterThanOrEqual(0);
    }
  });

  it('does not retain the replaced vulnerable dependency major versions', () => {
    for (const [, name, version] of records) {
      if (name === 'vitest') expect(Number(version.split('.')[0])).toBeGreaterThanOrEqual(3);
      if (name === 'vite') expect(Number(version.split('.')[0])).toBeGreaterThanOrEqual(6);
      if (name === 'deepmerge-ts') expect(Number(version.split('.')[0])).toBeGreaterThanOrEqual(8);
      if (name === 'serialize-javascript') expect(Number(version.split('.')[0])).toBeGreaterThanOrEqual(7);
    }
  });

  it.each(['.', 'apps/app'])('keeps the runner, UI and both coverage providers aligned in %s', (directory) => {
    const manifest = JSON.parse(readFileSync(path.join(root, directory, 'package.json'), 'utf8'));
    const version = manifest.devDependencies.vitest;
    expect(version).toBe('3.2.7');
    for (const dependency of ['@vitest/ui', '@vitest/coverage-v8', '@vitest/coverage-istanbul']) {
      expect(manifest.devDependencies[dependency]).toBe(version);
    }
  });
});
