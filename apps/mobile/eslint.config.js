// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    ignores: ['src/adapters/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['@clerk/*', '@supabase/*', '@sentry/*', 'posthog*', 'resend', 'inngest'],
          paths: [
            {
              name: '@clerk/clerk-expo',
              message: 'Use mobile auth adapter(s) in src/adapters/auth/* and @wrelik/auth react-native mapping.',
            },
            {
              name: '@supabase/supabase-js',
              message: 'Use a mobile adapter/client boundary instead of direct Supabase SDK imports.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ['dist/*'],
  },
]);
