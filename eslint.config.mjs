import {readabilityConfig} from './packages/eslint-config/readability.mjs';

import tseslint from 'typescript-eslint';

export default tseslint.config(readabilityConfig, ...tseslint.configs.recommended, {
  files: ['**/*.mjs'],
  rules: {'@typescript-eslint/no-require-imports': 'off'},
});
