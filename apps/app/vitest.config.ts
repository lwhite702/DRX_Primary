import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const isVitest = Boolean(process.env.VITEST);

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
      '**/tests/regression/**', // Exclude regression tests
      '**/tests/security/**', // Exclude security tests
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
      reportsDirectory: './coverage',
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
      },
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
