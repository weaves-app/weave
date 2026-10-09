import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import patch from './renderer-privacy-patch.json' with {type: 'json'};
const require = createRequire(import.meta.url);
const manifestPath = require.resolve('react-native/package.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const sourcePath = path.join(path.dirname(manifestPath), patch.relativePath);
const source = fs.readFileSync(sourcePath, 'utf8');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
if (manifest.version !== patch.packageVersion)
  throw new Error('Review renderer privacy patch before adopting a different React Native version');
if (hash(source) !== patch.patchedSha256) {
  if (hash(source) !== patch.originalSha256)
    throw new Error('Renderer source differs from the pinned privacy patch');
  const result = source.replace(patch.original, patch.replacement);
  if (hash(result) !== patch.patchedSha256)
    throw new Error('Renderer privacy patch verification failed');
  fs.writeFileSync(sourcePath, result);
}
console.log('Applied pinned React Native renderer diagnostics privacy patch.');
