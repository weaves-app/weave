import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import babel from '@babel/core';
const require = createRequire(import.meta.url);
const renderer = path.join(
  path.dirname(require.resolve('react-native/package.json')),
  'src/private/renderer/errorhandling/ErrorHandlers.js',
);
const output = babel.transformSync(fs.readFileSync(renderer, 'utf8'), {
  filename: renderer,
  babelrc: false,
  configFile: false,
  presets: ['@react-native/babel-preset'],
});
assert.ok(output && output.code);
const captured = [];
const exportsObject = {};
vm.runInNewContext(output.code, {
  exports: exportsObject,
  module: {exports: exportsObject},
  Error,
  console: {warn: (value) => captured.push({error: value, fatal: false})},
  require: (name) =>
    name.endsWith('/ExceptionsManager')
      ? {
          __esModule: true,
          SyntheticError: Error,
          default: {handleException: (error, fatal) => captured.push({error, fatal})},
        }
      : require(name),
});
for (const name of ['onCaughtError', 'onUncaughtError', 'onRecoverableError']) {
  captured.length = 0;
  const seeded = new Error('weave-synthetic-private-value');
  exportsObject[name](seeded, {componentStack: 'weave-synthetic-private-stack'});
  assert.equal(captured.length, 1, 'Preserve exactly one diagnostic at each renderer severity');
  const serialized = JSON.stringify(
    captured[0].error,
    Object.getOwnPropertyNames(captured[0].error),
  );
  assert.ok(
    !serialized.includes('weave-synthetic-private'),
    'Renderer diagnostics must remove raw values and component stacks',
  );
  assert.ok(!captured[0].error.stack, 'Renderer diagnostics must remove error stacks');
  assert.equal(
    captured[0].fatal,
    name === 'onUncaughtError',
    'Preserve fatality without logging sensitive details',
  );
}
console.log('Renderer privacy probe: three severities sanitized; fatality preserved.');
