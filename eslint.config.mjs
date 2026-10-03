import tseslint from 'typescript-eslint';
export default tseslint.config(...tseslint.configs.recommended, {
  files: ['**/*.mjs'],
  rules: {'@typescript-eslint/no-require-imports': 'off'},
});
