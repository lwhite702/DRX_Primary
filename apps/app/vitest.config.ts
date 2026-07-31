import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';

const isVitest = Boolean(process.env.VITEST);
const coveragePolicy = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../docs/testing/COVERAGE_POLICY.json'),
    'utf8',
  ),
) as {
  ratchetFloor: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
  };
};

export default defineConfig({
  plugins: [react()],
  css: isVitest
    ? {
        postcss: {
          plugins: [],
        },
      }
    : undefined,
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: false,
    exclude: [
      '**/node_modules/**', 
      '**/dist/**', 
      '**/cypress/**', 
      '**/.{idea,git,cache,output,temp}/**', 
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/*.spec.ts', // Exclude Playwright tests
      '**/tests/e2e/**', // Exclude E2E tests
      '**/tests/integration/**', // Exclude integration tests that require full setup
      '**/tests/quick-pos/**', // Exclude quick-pos tests with import issues
      '**/tests/regression/**', // Exclude regression tests
      '**/tests/security/**', // Exclude security tests
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      all: true,
      reportsDirectory: './coverage',
      // The ratchet prevents regression from the measured full-suite baseline.
      // The 90% target remains explicit in docs/testing/COVERAGE_POLICY.json.
      thresholds: coveragePolicy.ratchetFloor,
      include: [
        'lib/utils/**/*.ts',
        'lib/hooks/**/*.ts',
        'lib/hooks/**/*.tsx',
        'lib/services/**/*.ts',
        'lib/services/**/*.tsx',
        'lib/**/*.ts',
        'lib/**/*.tsx',
      ],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/build/**',
        '**/*.d.ts',
        '**/*.config.*',
        'app/**',
        'components/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './tests/mocks/server-only.ts'),
    },
  },
});
