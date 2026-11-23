import assert from 'node:assert/strict';
import test from 'node:test';
import {Linter} from 'eslint';
import tseslint from 'typescript-eslint';

import {createConfig} from '../../packages/eslint-config/index.mjs';

export const READABILITY_RULE_ID = 'weave/readability';

export const COMMENT_FIXTURE = 'attached comments and directives';

const config = [
  {languageOptions: {parser: tseslint.parser}},
  ...createConfig(process.cwd()).filter((item) => item.rules?.['weave/readability']),
];

const linter = new Linter();

for (const [label, source] of [
  [
    'import groups and imports ending',
    "import x from 'react';\nimport y from '@weave/design-tokens';\nimport z from './local';\nconst value = 1;",
  ],
  [
    'TypeScript declarations',
    'interface A {x: string;}\ninterface B {y: string;}\nfunction run() {}\nfunction next() {}',
  ],
  [
    'validation, operation and result',
    'function run() {\nconst value = 1;\nif (!value) return;\noperate();\nreturn value;\n}',
  ],
  ['class methods', 'class A {\nfirst() {}\nsecond() {}\n}'],
  ['object methods', 'const port = {\nfirst() {},\nsecond: () => {},\n};'],
  [
    'attached comments and directives',
    "'use client';\nimport x from 'react';\n// Public contract\nexport interface A {x: string;}",
  ],
]) {
  test(`R01/R03: rejects and fixes missing spacing: ${label}`, () => {
    const messages = linter.verify(source, config);

    assert.ok(messages.some((message) => message.ruleId === READABILITY_RULE_ID));

    const fixed = linter.verifyAndFix(source, config);

    assert.equal(fixed.messages.length, 0);
    assert.equal(linter.verifyAndFix(fixed.output, config).fixed, false);
    assert.equal(fixed.output.replace(/\s/g, ''), source.replace(/\s/g, ''));

    if (label === COMMENT_FIXTURE) {
      assert.match(fixed.output, /\n\n\/\/ Public contract\nexport interface/);
    }
  });
}

test('R02: leaves same-group imports and compliant code unchanged', () => {
  const source =
    "import x from 'react';\nimport y from 'next';\n\nimport z from './local';\n\ninterface A {x: string;}\n\nfunction run() {\nconst x = 1;\nconst y = 2;\n\noperate(x, y);\n\nreturn x;\n}";

  assert.deepEqual(linter.verify(source, config), []);
  assert.equal(linter.verifyAndFix(source, config).fixed, false);
});

test('R03: keeps decorators attached to their declaration', () => {
  const source =
    "import {Controller} from '@nestjs/common';\n@Controller('health')\nexport class Health {}";
  const fixed = linter.verifyAndFix(source, config);

  assert.match(fixed.output, /;\n\n@Controller/);
  assert.match(fixed.output, /@Controller\('health'\)\nexport class/);
});
