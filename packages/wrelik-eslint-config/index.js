module.exports = {
  extends: ['next', 'turbo', 'prettier', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
    'react/jsx-key': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'only-warn'],
  ignorePatterns: ['dist', '**/*.css'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@clerk/nextjs',
            message: 'Please use @wrelik/auth instead.',
          },
          {
            name: '@prisma/client',
            message: 'Please use @wrelik/db instead.',
          },
          {
            name: 'resend',
            message: 'Please use @wrelik/email instead.',
          },
          {
            name: 'posthog-node',
            message: 'Please use @wrelik/analytics instead.',
          },
          {
            name: 'inngest',
            message: 'Please use @wrelik/jobs instead.',
          },
        ],
        patterns: [
          {
            group: ['@aws-sdk/*'],
            message: 'Please use @wrelik/storage instead.',
          },
        ],
      },
    ],
  },
};
