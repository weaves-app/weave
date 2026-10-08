import assert from 'node:assert/strict';
import {test} from 'node:test';

import {inspectSources} from '../../scripts/architecture.mjs';

test('S04 rejects outward domain dependencies and cross-module internals', () => {
  assert.ok(
    inspectSources({
      'apps/api/src/modules/orders/domain/entity.ts': "import {Module} from '@nestjs/common';",
    }).length,
  );
  assert.ok(
    inspectSources({
      'apps/api/src/modules/orders/application/use.ts':
        "import {Repo} from '../infrastructure/repo';",
    }).length,
  );
  assert.ok(
    inspectSources({
      'apps/api/src/modules/orders/application/use.ts':
        "import {User} from '../../users/domain/user';",
    }).length,
  );
  assert.equal(
    inspectSources({
      'apps/api/src/modules/orders/application/use.ts':
        "import type {UserPort} from '../../users/contracts/user';",
    }).length,
    0,
  );
});

test('S05 requires interface types for injected dependencies', () => {
  assert.ok(
    inspectSources({
      'apps/api/src/modules/orders/application/use.ts':
        'class Repo {} export class Use {constructor(repo: Repo) {}}',
    }).length,
  );
  assert.equal(
    inspectSources({
      'apps/api/src/modules/orders/application/use.ts':
        'interface Repo {} export class Use {constructor(repo: Repo) {}}',
    }).length,
    0,
  );
  assert.ok(
    inspectSources({
      'apps/api/src/modules/orders/order.controller.ts':
        'interface Port {} @Controller() class Controller {constructor(port: Port) {}}',
    }).length,
  );
});

test('S04 rejects resolved controller imports from the application layer', () => {
  assert.ok(
    inspectSources({
      'apps/api/src/modules/orders/application/use.ts':
        "import {Controller} from '../order.controller';",
      'apps/api/src/modules/orders/order.controller.ts': 'export class Controller {}',
    }).length,
  );
});

test('S14 resolves aliases within their owning workspace', () => {
  const sources = {
    'apps/mobile/src/a.ts': "import {b} from '@/b'; export const a = b;",
    'apps/mobile/src/b.ts': "import {a} from './a'; export const b = a;",
  };
  const errors = inspectSources(sources, {
    'apps/mobile': {module: 'esnext', moduleResolution: 'bundler', paths: {'@/*': ['./src/*']}},
  });

  assert.ok(
    errors.some((error) => error.includes('Import cycle')),
    errors.join('\n'),
  );
});
