// metro.config.js
const { getPostHogExpoConfig } = require("posthog-react-native/metro");
const path = require("path");
const { FileStore } = require("metro-cache");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

// Get default config wrapped with PostHog's serializers
const config = getPostHogExpoConfig(projectRoot);

// Turn on checking for hoisting to workspace root
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Use a stable on-disk store
const root =
  process.env.METRO_CACHE_ROOT || path.join(__dirname, ".metro-cache");
config.cacheStores = [new FileStore({ root: path.join(root, "cache") })];

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

module.exports = config;
