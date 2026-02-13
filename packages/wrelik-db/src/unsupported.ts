export default function () {
  throw new Error(
    'This package is server-only and cannot be used in client/mobile environments. ' +
      'Access this functionality via a backend API instead.',
  );
}

// Using a Proxy to trap named imports if possible, or just the top level throw is usually enough for side-effect imports.
// But for named imports, we might need to export them?
// Since we can't mock all exports, the top level throw is best.
throw new Error(
  'This package is server-only and cannot be used in client/mobile environments. ' +
    'Access this functionality via a backend API instead.',
);
