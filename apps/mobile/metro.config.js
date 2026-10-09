const path = require('node:path');

const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const workspaceRoot = path.resolve(__dirname, '../..');

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [path.join(workspaceRoot, 'packages'), path.join(workspaceRoot, 'node_modules')],
  resolver: {
    // pnpm links workspace packages locally even with the hoisted linker.
    nodeModulesPaths: [
      path.join(__dirname, 'node_modules'),
      path.join(workspaceRoot, 'node_modules'),
    ],
    disableHierarchicalLookup: true,
  },
});
