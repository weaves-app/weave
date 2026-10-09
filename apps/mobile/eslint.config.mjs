import {createConfig} from '@weave/eslint-config';

export default [
  {ignores: ['vendor/**', 'ios/**', 'android/**']},
  ...createConfig(import.meta.dirname, 'tsconfig.json'),
  {files: ['*.config.js'], rules: {'@typescript-eslint/no-require-imports': 'off'}},
  // Metro's static image modules expose a default import.
  {files: ['src/assets.d.ts'], rules: {'no-restricted-syntax': 'off'}},
  // React Navigation requires a closed route-map type alias.
  {
    files: ['src/navigation/root-navigator.tsx'],
    rules: {'@typescript-eslint/consistent-type-definitions': 'off'},
  },
];
