import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {ESLint} from 'eslint';
import tseslint from 'typescript-eslint';

export const ruleId = 'weave-values/no-literal-comparisons';

for (const [label, cwd, filePath] of [
  ['mobile', path.resolve('apps/mobile'), 'src/navigation/root-navigator.tsx'],
  ['web', path.resolve('apps/web'), 'src/features/auth/application/policy.ts'],
  ['root staged files', process.cwd(), 'apps/mobile/src/navigation/root-navigator.tsx'],
  ['scripts', process.cwd(), 'scripts/policy.mjs'],
]) {
  const eslint = new ESLint({
    cwd,
    overrideConfig: {
      files: ['**/*.ts', '**/*.tsx', '**/*.mjs'],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: {project: false, tsconfigRootDir: cwd},
      },
      rules: {
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-misused-promises': 'off',
        '@typescript-eslint/no-unnecessary-type-assertion': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/prefer-readonly': 'off',
      },
    },
  });

  for (const source of [
    "state.session.status === 'resolving';",
    "'active' !== state.session.status;",
    "session?.['status'] == `signedOut`;",
    "mode !== 'password';",
    'count >= 6;',
    "state.error?.code ?? 'unexpected';",
    'message || `unavailable`;',
    'count ?? 0;',
    'count || -1;',
    "const FALLBACK = 'unexpected'; state.error?.code ?? FALLBACK;",
    '-1 < index;',
    'offset === 0;',
    'offset === +1;',
    "status === ('active' satisfies string);",
    "const statuses = {active: 'active'} as const; status === statuses.active;",
    "switch (kind) {case 'complete': break;}",
    'switch (code) {case 200: break;}',
    "status === ('active' as const);",
    'const LIMIT = 6; count > LIMIT;',
    "const STATUS = {ACTIVE: 'active'} as const; status === STATUS.ACTIVE;",
  ]) {
    test(`S22/S23 ${label}: rejects comparison magic values: ${source}`, async () => {
      const [result] = await eslint.lintText(source, {filePath});

      assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
      assert.equal(result.messages.filter((message) => message.ruleId === ruleId).length, 1);
    });
  }

  for (const source of [
    "export const STATUS = {ACTIVE: 'active'} as const; status === STATUS.ACTIVE;",
    'export const LIMIT = 6; count >= LIMIT;',
    'const LIMIT = 6; export {LIMIT}; count >= LIMIT;',
    "import {STATUS} from './constants'; status === STATUS.ACTIVE;",
    'switch (status) {case SESSION_STATUS.ACTIVE: break;}',
    "typeof value === 'string';",
    "'object' !== typeof value;",
    "switch (typeof value) {case 'string': break;}",
    'value === null;',
    'value !== undefined;',
    'ready === false;',
    'count > otherCount;',
    "const label = 'active';",
    'const size = 6;',
    "export const ERRORS = {UNEXPECTED: 'unexpected'} as const; state.error?.code ?? ERRORS.UNEXPECTED;",
    'value ?? defaultValue;',
    'value || defaultValue;',
    'value ?? null;',
    'value ?? false;',
    'const limit = getLimit(); count > limit;',
    'const current = {status: readStatus()}; status === current.status;',
    "expect(status).toBe('active');",
    'assert.equal(count, 6);',
  ]) {
    test(`S21/S23 ${label}: allows constants and agreed exceptions: ${source}`, async () => {
      const [result] = await eslint.lintText(source, {filePath});

      assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
      assert.equal(result.messages.filter((message) => message.ruleId === ruleId).length, 0);
    });
  }

  if (filePath.endsWith('.tsx')) {
    for (const [source, expected] of [
      ['<Stack.Screen name="Home" />;', 1],
      ['<Stack.Screen navigationKey="protected" />;', 1],
      ["<Stack.Screen name={'Home'} />;", 1],
      ['<Stack.Screen navigationKey={`protected`} />;', 1],
      ['<Stack.Navigator initialRouteName="Login" />;', 1],
      ['<Stack.Group navigationKey="public" />;', 1],
      ["const KEY = 'public'; <Stack.Group navigationKey={KEY} />;", 1],
      ["export const ROUTE = {HOME: 'Home'} as const; <Stack.Screen name={ROUTE.HOME} />;", 0],
      ["import {KEY} from './routes'; <Stack.Group navigationKey={KEY.PUBLIC} />;", 0],
      ['<Stack.Screen navigationKey={sessionKey} />;', 0],
      ['<input name="email" />;', 0],
      ['<Text>Home</Text>;', 0],
      ['<Stack.Screen options={{title: "Home"}} />;', 0],
    ]) {
      test(`S21/S22/S23 ${label}: navigation identifiers: ${source}`, async () => {
        const [result] = await eslint.lintText(source, {filePath});

        assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
        assert.equal(
          result.messages.filter((message) => message.ruleId === ruleId).length,
          expected,
        );
      });
    }
  }
}
