import {readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {inspectSources} from './architecture.mjs';
const sources = {};
function scan(directory) {
  for (const entry of readdirSync(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    if (
      entry.isDirectory() &&
      !['node_modules', 'generated', '.next', 'dist', '.expo'].includes(entry.name)
    )
      scan(file);
    else if (entry.isFile() && /\.(ts|tsx)$/.test(file) && !/\.test\./.test(file))
      sources[file] = readFileSync(file, 'utf8');
  }
}
scan('apps');
scan('packages');
const errors = inspectSources(sources);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('Architecture and interface injection checks passed.');
