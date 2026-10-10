import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {ESLint} from 'eslint';

export const optionRuleId = 'weave-values/no-inline-option-values';

for (const [label, cwd, filePath] of [
  ['mobile', path.resolve('apps/mobile'), 'src/components/form-field.tsx'],
  ['root', process.cwd(), 'apps/mobile/src/components/form-field.tsx'],
]) {
  const eslint = new ESLint({
    cwd,
    overrideConfig: {languageOptions: {parserOptions: {tsconfigRootDir: cwd}}},
  });

  for (const [source, expected] of [
    ["declare function submit(stage: 'verifying' | 'idle'): void; submit('idle' as 'idle');", 1],
    [
      "declare function submit(stage: 'verifying' | 'idle'): void; const OPTIONS = {IDLE: 'idle'} as const; submit(OPTIONS.IDLE);",
      1,
    ],
    [
      "declare function submit(stage: 'verifying' | 'idle'): void; const stage = 'idle' as const; submit(stage);",
      1,
    ],
    ["declare function tap(mode: 'handled' | 'always' | boolean): void; tap('handled');", 1],
    ["export function next(): 'idle' | 'verifying' {return 'idle';}", 1],
    [
      "declare function submit(stage: 'verifying' | 'idle'): void; const OPTIONS = {IDLE: 'idle'} as const; export {OPTIONS}; submit(OPTIONS.IDLE);",
      0,
    ],
    ["declare function tap(mode: 'handled' | 'always' | boolean): void; tap(false);", 0],
    [
      "declare function submit(stage: 'verifying' | 'idle'): void; const OPTIONS = {IDLE: readStage()}; declare function readStage(): 'idle' | 'verifying'; submit(OPTIONS.IDLE);",
      0,
    ],
    ["declare function submit(stage: 'verifying' | 'idle'): void; submit('verifying');", 1],
    ["interface State {stage: 'verifying' | 'idle'}; const state: State = {stage: 'idle'};", 1],
    ["let stage: 'verifying' | 'idle'; stage = 'verifying';", 1],
    ["function next(): 'verifying' | 'idle' {return 'idle';}", 1],
    ["function next(stage: 'verifying' | 'idle' = 'idle') {}", 1],
    [
      "declare const flag: boolean; declare function submit(stage: 'verifying' | 'idle'): void; submit(flag ? 'verifying' : 'idle');",
      2,
    ],
    [
      "declare function submit(stage: 'new-option' | 'other-option'): void; submit(`new-option`);",
      1,
    ],
    [
      "import {TextInput} from 'react-native'; const view = <TextInput keyboardType='number-pad' />;",
      1,
    ],
    [
      "declare function submit(stage: 'verifying' | 'idle'): void; const stage = 'idle'; submit(stage);",
      1,
    ],
    [
      "export const STAGE = {IDLE: 'idle'} as const; declare function submit(stage: 'verifying' | 'idle'): void; submit(STAGE.IDLE);",
      0,
    ],
    [
      "import {LOGIN_STAGE} from '../auth/domain/auth-models'; declare function submit(stage: 'verifying' | 'idle'): void; submit(LOGIN_STAGE.VERIFYING);",
      0,
    ],
    ["declare function label(value: string): void; label('Welcome back');", 0],
    ["const message = 'Welcome back';", 0],
    ["declare const result: object; 'kind' in result;", 0],
    ["export const STAGE: {IDLE: 'idle'} = {IDLE: 'idle'};", 0],
    [
      "declare function submit(stage: 'verifying' | 'idle'): void; declare const dynamic: 'verifying' | 'idle'; submit(dynamic);",
      0,
    ],
  ]) {
    test(`S21/S22/S23 ${label} typed option values: ${source}`, async () => {
      const [result] = await eslint.lintText(source, {filePath});

      assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
      assert.equal(
        result.messages.filter((message) => message.ruleId === optionRuleId).length,
        expected,
      );
    });
  }
}
