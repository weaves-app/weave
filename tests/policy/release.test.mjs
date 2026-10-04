import assert from 'node:assert/strict';
import {test} from 'node:test';
import {nextVersion} from '../../scripts/release-policy.mjs';
test('S12 main releases classify Conventional Commits by highest impact', () => {
  assert.equal(nextVersion('1.2.3', ['fix: repair bug [WEA-6]']), '1.2.4');
  assert.equal(
    nextVersion('1.2.3', ['feat: add feature [WEA-6]', 'fix: repair bug [WEA-6]']),
    '1.3.0',
  );
  assert.equal(nextVersion('1.2.3', ['feat(api)!: remove contract [WEA-6]']), '2.0.0');
  assert.equal(nextVersion('0.0.0', ['feat: add scaffold [WEA-6]']), '0.1.0');
  assert.equal(nextVersion('1.2.3', ['docs: document setup [WEA-6]']), '1.2.4');
  assert.equal(nextVersion('1.2.3', []), null);
  assert.throws(() => nextVersion('bad', ['feat: add x [WEA-6]']));
});

test('S17 breaking changes stay in development versions until explicit 1.0', () => {
  assert.equal(nextVersion('0.2.3', ['feat!: remove old contract [WEA-6]']), '0.3.0');
});
