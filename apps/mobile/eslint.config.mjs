import {createConfig} from '@weave/eslint-config';

export default [
  {ignores: ['vendor/**', 'ios/**', 'android/**']},
  ...createConfig(import.meta.dirname, 'tsconfig.json'),
  {files: ['*.config.js'], rules: {'@typescript-eslint/no-require-imports': 'off'}},
];
