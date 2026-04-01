import { describe, it, expect } from 'vitest';
import { validateEventName } from './shared';

describe('Analytics Shared', () => {
  it('validates correct event names', () => {
    expect(() => validateEventName('app.page.view')).not.toThrow();
    expect(() => validateEventName('user.signup.success')).not.toThrow();
  });

  it('throws on invalid event names', () => {
    expect(() => validateEventName('invalid')).toThrow(/must follow/);
    expect(() => validateEventName('almost.valid')).toThrow(/must follow/);
  });
});
