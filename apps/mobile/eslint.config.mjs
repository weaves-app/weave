import {createConfig} from '@weave/eslint-config';

export default [
  ...createConfig(import.meta.dirname, 'tsconfig.json'),
  {files: ['*.config.js'], rules: {'@typescript-eslint/no-require-imports': 'off'}},
];
