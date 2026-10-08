const path = require('node:path');

const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const workspaceRoot = path.resolve(__dirname, '../..');

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [path.join(workspaceRoot, 'packages'), path.join(workspaceRoot, 'node_modules')],
  resolver: {
    nodeModulesPaths: [path.join(workspaceRoot, 'node_modules')],
    disableHierarchicalLookup: true,
  },
});
