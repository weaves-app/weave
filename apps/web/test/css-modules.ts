import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const testRequire = createRequire(import.meta.url);

// Node cannot load CSS. Only module class names are needed by DOM behavior tests.
testRequire.extensions['.css'] = (module, filename): void => {
  if (!filename.endsWith('.module.css')) throw new Error(`Unexpected CSS import: ${filename}`);

  const selectors = readFileSync(filename, 'utf8').matchAll(/\.([a-zA-Z_][\w-]*)/g);

  module.exports = Object.fromEntries([...selectors].map((match) => [match[1], match[1]]));
};
