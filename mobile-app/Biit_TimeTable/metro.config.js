const fs = require('fs');
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { FileStore } = require('metro-cache');

// Keep Metro's cache off the C: drive (set via METRO_CACHE_DIR user env var).
const metroCacheDir = process.env.METRO_CACHE_DIR || 'D:\\ReactNativeDev\\metro-cache';
// Metro doesn't create the file-map cache directory itself.
fs.mkdirSync(path.join(metroCacheDir, 'file-map'), { recursive: true });

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  cacheStores: [new FileStore({ root: path.join(metroCacheDir, 'transform') })],
  fileMapCacheDirectory: path.join(metroCacheDir, 'file-map'),
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
