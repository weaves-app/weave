import {comparisonConstantsConfig} from './packages/eslint-config/comparison-constants.mjs';
import {readabilityConfig} from './packages/eslint-config/readability.mjs';

import tseslint from 'typescript-eslint';

export default tseslint.config(
  readabilityConfig,
  comparisonConstantsConfig,
  ...tseslint.configs.recommended,
  {
    files: ['apps/mobile/src/**/*.ts', 'apps/mobile/src/**/*.tsx', 'apps/mobile/App.tsx'],
    ignores: ['**/*.test.ts', '**/*.test.tsx', 'apps/mobile/src/auth/testing/**'],
    languageOptions: {
      parserOptions: {project: ['apps/mobile/tsconfig.json'], tsconfigRootDir: import.meta.dirname},
    },
    rules: {'weave-values/no-inline-option-values': 'error'},
  },
  {
    files: ['**/*.mjs'],
    rules: {'@typescript-eslint/no-require-imports': 'off'},
  },
);
