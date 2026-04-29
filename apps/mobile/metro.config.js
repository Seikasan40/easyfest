// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch all files within the monorepo for live reload across packages
config.watchFolders = [monorepoRoot];

// Make Metro look for nested node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Force resolution to a single React + RN instance (évite le crash dual-render)
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
