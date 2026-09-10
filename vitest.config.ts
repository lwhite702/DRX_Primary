import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/*',
      {
        test: {
          name: 'shared-package-source',
          environment: 'node',
          include: ['packages/wrelik-*/src/**/*.test.ts'],
        },
      },
    ],
  },
});
