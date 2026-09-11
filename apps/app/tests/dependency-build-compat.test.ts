// @vitest-environment node
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const pwaRequire = createRequire(require.resolve('@ducanh2912/next-pwa'));
const workboxRequire = createRequire(pwaRequire.resolve('workbox-build'));

describe('patched PWA build dependencies', () => {
  it('renders the installed Workbox service-worker template', () => {
    const { populateSWTemplate } = workboxRequire('./lib/populate-sw-template.js');
    const source = populateSWTemplate({
      manifestEntries: [{ url: '/synthetic-asset.js', revision: 'fixture' }],
      skipWaiting: true,
    });
    expect(source).toContain('/synthetic-asset.js');
    expect(source).toContain('precacheAndRoute');
  });

  it('minifies with the installed Workbox Rollup worker and patched serializer', async () => {
    // Follow the real parent dependency edges rather than a hoisted test copy.
    // serialize-javascript 7 raises the Node minimum to 20; DRX runs Node 22.
    expect(Number(process.versions.node.split('.')[0])).toBeGreaterThanOrEqual(20);
    const { rollup } = workboxRequire('rollup');
    const terser = workboxRequire('@rollup/plugin-terser');
    const bundle = await rollup({
      input: 'synthetic-worker',
      plugins: [{
        name: 'synthetic-source',
        resolveId: (id: string) => id === 'synthetic-worker' ? id : null,
        load: (id: string) => id === 'synthetic-worker'
          ? 'export const result = 20 + 22;'
          : null,
      }, terser({ maxWorkers: 1, format: { comments: false } })],
    });

    try {
      const { output } = await bundle.generate({ format: 'es' });
      expect(output[0].code).toContain('42');
      expect(output[0].code).toContain('export');
      expect(output[0].code).not.toContain('20 + 22');
    } finally {
      await bundle.close();
    }
  });
});

describe('consumer-scoped security upgrades', () => {
  it('loads the repository Prisma config through the patched deepmerge dependency', async () => {
    const prismaRequire = createRequire(require.resolve('prisma/package.json'));
    const { loadConfigFromFile } = prismaRequire('@prisma/config');
    const result = await loadConfigFromFile({
      configRoot: path.resolve(__dirname, '..'),
      configFile: 'prisma.config.ts',
    });
    // Assert only configuration structure, never datasource/environment values.
    expect(result.error).toBeUndefined();
    expect(result.config.schema).toBe(path.resolve(__dirname, '../prisma/schema.prisma'));
    expect(result.config.migrations.path).toBe(path.resolve(__dirname, '../prisma/migrations'));
  });

  it('loads patched sharp through Next and resizes a synthetic image', async () => {
    const { getSharp, optimizeImage } = require('next/dist/server/image-optimizer');
    const sharp = getSharp(1);
    expect(sharp.versions.sharp).toBe('0.35.4');
    const input = await sharp({
      create: { width: 8, height: 8, channels: 4, background: '#123456' },
    }).png().toBuffer();
    const output = await optimizeImage({
      buffer: input, contentType: 'image/png', quality: 80, width: 4, concurrency: 1,
    });
    const metadata = await sharp(output).metadata();
    expect(metadata.width).toBe(4);
    expect(metadata.height).toBe(4);
    expect(metadata.format).toBe('png');
  });
});
