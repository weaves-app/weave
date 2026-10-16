const path = require('node:path');

const {mergeConfig} = require('@react-native/metro-config');

const base = require('./metro.config.js');

const scenario = process.env.WEAVE_I18N_FIXTURE_SCENARIO;

const scenarios = ['login', 'verification', 'home', 'retry', 'recovery'];

if (!scenarios.includes(scenario)) throw new Error('Select a known WEAVE_I18N_FIXTURE_SCENARIO.');

const canonical = path.resolve(__dirname, 'src/localization/resources/en.ts');

const expanded = path.resolve(__dirname, 'src/localization/testing/expanded-en.ts');

module.exports = mergeConfig(base, {
  server: {
    rewriteRequestUrl: (url) =>
      url.replace(
        /(^|\/)index\.(bundle(?:\.map)?|map)(?=\?|$)/,
        (_match, prefix, extension) =>
          `${prefix}src/localization/testing/native-entries/${scenario}.${extension}`,
      ),
  },
  resolver: {
    resolveRequest: (context, name, platform) => {
      const result = context.resolveRequest(context, name, platform);

      if (
        'filePath' in result &&
        result.filePath === canonical &&
        context.originModulePath !== expanded
      )
        return {...result, filePath: expanded};

      return result;
    },
  },
});
