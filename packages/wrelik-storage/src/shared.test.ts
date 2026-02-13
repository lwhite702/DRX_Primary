import { describe, it, expect } from 'vitest';
import { validateUpload } from './shared';

describe('Storage Shared', () => {
  it('validates upload policy', () => {
    const policy = { maxSizeBytes: 100, allowedTypes: ['image/png'] };

    expect(() => validateUpload({ contentType: 'image/png', sizeBytes: 50 }, policy)).not.toThrow();

    expect(() => validateUpload({ contentType: 'image/jpeg', sizeBytes: 50 }, policy)).toThrow(
      /Invalid file type/,
    );
    expect(() => validateUpload({ contentType: 'image/png', sizeBytes: 150 }, policy)).toThrow(
      /File too large/,
    );
  });
});
