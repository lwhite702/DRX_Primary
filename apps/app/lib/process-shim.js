/* eslint-disable */
// Safe browser/client-side shim for the Node 'process' package
const browserProcess = {
  title: 'browser',
  browser: true,
  env: typeof window !== 'undefined' && window.process && window.process.env ? window.process.env : {},
  argv: [],
  version: 'v18.0.0',
  versions: {
    node: '18.0.0',
    uv: '1.0.0',
    v8: '1.0.0',
    ares: '1.0.0',
    modules: '1.0.0',
    openssl: '1.0.0',
    zlib: '1.0.0',
    http_parser: '1.0.0',
    unicode: '1.0.0',
    icu: '1.0.0',
    tpm2: '1.0.0',
  },
  on: () => {},
  addListener: () => {},
  once: () => {},
  off: () => {},
  removeListener: () => {},
  removeAllListeners: () => {},
  emit: () => {},
  prependListener: () => {},
  prependOnceListener: () => {},
  listeners: () => [],
  binding: () => { throw new Error('process.binding is not supported'); },
  cwd: () => '/',
  chdir: () => {},
  umask: () => 0,
};

module.exports = browserProcess;
module.exports.default = browserProcess;
module.exports.versions = browserProcess.versions;
module.exports.env = browserProcess.env;
