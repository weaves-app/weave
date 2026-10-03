import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.expo/**',
      '**/generated/**',
      '**/next-env.d.ts',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['apps/**/*.ts', 'apps/**/*.tsx', 'packages/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: [
          'apps/api/tsconfig.lint.json',
          'apps/web/tsconfig.json',
          'apps/mobile/tsconfig.json',
          'packages/design-tokens/tsconfig.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', {prefer: 'type-imports'}],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {allowExpressions: true, allowTypedFunctionExpressions: true},
      ],
      'no-restricted-syntax': [
        'error',
        {selector: 'PrivateIdentifier', message: 'Use TypeScript private visibility.'},
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports; framework entrypoints have narrow exceptions.',
        },
      ],
    },
  },
  {
    files: ['apps/web/src/**/*.tsx', 'apps/mobile/**/*.tsx'],
    plugins: {'react-hooks': hooks},
    rules: hooks.configs.recommended.rules,
  },
  {
    files: [
      'apps/web/src/app/**/page.tsx',
      'apps/web/src/app/**/layout.tsx',
      'apps/mobile/App.tsx',
      'apps/api/prisma.config.ts',
      'apps/web/next.config.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {selector: 'PrivateIdentifier', message: 'Use TypeScript private visibility.'},
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {'@typescript-eslint/explicit-function-return-type': 'off'},
  },
  {files: ['**/*.mjs'], rules: {'@typescript-eslint/no-require-imports': 'off'}},
);
