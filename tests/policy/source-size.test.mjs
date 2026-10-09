import assert from 'node:assert/strict';
import test from 'node:test';
import {Linter} from 'eslint';

import {createConfig} from '../../packages/eslint-config/index.mjs';

const config = createConfig(process.cwd()).filter((item) => item.rules?.['max-lines']);

const linter = new Linter();

for (const [lines, rejected] of [
  [500, false],
  [501, true],
]) {
  test(`WEA-24 S09 ${lines} authored lines are ${rejected ? 'rejected' : 'accepted'}`, () => {
    const source = Array.from({length: lines}, () => 'void 0;').join('\n');
    const messages = linter.verify(source, config);

    assert.equal(
      messages.some((message) => message.ruleId === 'max-lines'),
      rejected,
    );
  });
}

test('WEA-24 S09 blank and comment lines count toward the file limit', () => {
  const source = `${'\n'.repeat(499)}// A comment\nvoid 0;`;
  const messages = linter.verify(source, config);

  assert.ok(messages.some((message) => message.ruleId === 'max-lines'));
});
