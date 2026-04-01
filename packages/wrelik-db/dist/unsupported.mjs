// src/unsupported.ts
function unsupported_default() {
  throw new Error(
    "This package is server-only and cannot be used in client/mobile environments. Access this functionality via a backend API instead."
  );
}
throw new Error(
  "This package is server-only and cannot be used in client/mobile environments. Access this functionality via a backend API instead."
);
export {
  unsupported_default as default
};
