import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    exclude: [
      '**/node_modules/**', 
      '**/dist/**', 
      '**/cypress/**', 
      '**/.{idea,git,cache,output,temp}/**', 
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/*.spec.ts', // Exclude Playwright tests
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
