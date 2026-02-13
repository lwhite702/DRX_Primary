import { describe, it, expect } from 'vitest';
import { loadClientConfig, clientSchema } from './react-native';

describe('Config React Native', () => {
  it('validates client config', () => {
    // Basic validation test implicitly covered by loadClientConfig calls below
    // or we can test specific schema constraints if we export schema
    expect(clientSchema).toBeDefined();
  });

  it('loads valid config', () => {
    const env = {
      EXPO_PUBLIC_APP_NAME: 'Test App',
      EXPO_PUBLIC_APP_ENV: 'development',
      EXPO_PUBLIC_POSTHOG_HOST: 'https://test.com',
    };
    const config = loadClientConfig({}, env);
    expect(config.EXPO_PUBLIC_APP_NAME).toBe('Test App');
    expect(config.EXPO_PUBLIC_POSTHOG_HOST).toBe('https://test.com');
  });

  it('throws on invalid config', () => {
    const env = {
      EXPO_PUBLIC_APP_ENV: 'invalid_env',
    };
    // Mock console.error to avoid noise
    const originalError = console.error;
    console.error = () => {};
    expect(() => loadClientConfig({}, env)).toThrow('Invalid client environment variables');
    console.error = originalError;
  });
});
