# @wrelik/errors

## 0.2.2

### Minor Changes

- Add `./server` and `./client` export aliases
- Enhanced `initErrors()` with full configuration options:
  - `environment`
  - `tracesSampleRate`
  - `replaysSessionSampleRate` (browser only)
  - `replaysOnErrorSampleRate` (browser only)
  - `sendDefaultPii`
- Add `addBreadcrumb()` function
- Add `captureMessage()` function

## 0.2.0

### Minor Changes

- a38ebcb: Add React Native / Expo support and enforce server-only boundaries.

## 0.1.1

### Patch Changes

- Update publishConfig to access:public for all packages.

## 0.1.0

### Minor Changes

- ad849e3: Initial release of all wrelik-kit packages.
