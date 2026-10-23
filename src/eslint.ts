import { defineConfig } from 'eslint/config';
import type { Linter } from 'eslint';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import { bannedSyntax } from './bannedSyntax.ts';
import { noUnusedResult } from './noUnusedResult.ts';

export { bannedSyntax };

// The baseline for a TypeScript project whose tsconfig is in `tsconfigRootDir`. A project adds its own blocks after
// it, such as ignores and import restrictions for its core.
export function baseline(tsconfigRootDir: string): Linter.Config[] {
  return defineConfig(
    { ignores: ['**/node_modules/', '**/dist/', '**/.devbox/', '**/coverage/'] },
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      plugins: {
        // typescript-eslint 8 types rules against ESLint 9's RuleContext, which ESLint 10 changed; the rule runs fine.
        // @ts-expect-error -- remove once typescript-eslint's rule types match ESLint 10.
        'ts-baseline': { rules: { 'no-unused-result': noUnusedResult } },
      },
      rules: {
        'ts-baseline/no-unused-result': 'error',
        '@typescript-eslint/switch-exhaustiveness-check': [
          'error',
          { considerDefaultExhaustiveForUnions: false, requireDefaultForNonUnion: false },
        ],
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/only-throw-error': 'error',
        '@typescript-eslint/prefer-readonly': 'error',
        '@typescript-eslint/no-unnecessary-condition': 'error',
        '@typescript-eslint/consistent-type-imports': 'error',
        // Ports are interfaces and variant families are types, so neither form is preferred everywhere.
        '@typescript-eslint/consistent-type-definitions': 'off',
        '@typescript-eslint/array-type': ['error', { default: 'array', readonly: 'generic' }],
        '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true, allowBoolean: true }],
        'no-restricted-syntax': ['error', ...bannedSyntax],
        // An underscore marks a name bound only to leave it out, as when a rest pattern drops fields.
        '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_', ignoreRestSiblings: true }],
        // Modified complexity counts a switch once: exhaustive switches over closed families grow with the family, not with risk.
        complexity: ['warn', { max: 10, variant: 'modified' }],
        'max-depth': ['warn', 3],
        'max-params': ['warn', 3],
      },
    },
    {
      files: ['**/*.tsx', '**/*.jsx'],
      plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
      rules: {
        ...jsxA11y.flatConfigs.recommended.rules,
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'error',
      },
    },
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      rules: {
        'no-restricted-properties': [
          'error',
          { object: 'vi', property: 'mock', message: 'Pass a fake in through a port instead.' },
          { object: 'vi', property: 'spyOn', message: 'Pass a fake in through a port instead.' },
          { object: 'vi', property: 'useFakeTimers', message: 'Take time from a clock port and pass a fixed clock.' },
          { object: 'vi', property: 'setSystemTime', message: 'Take time from a clock port and pass a fixed clock.' },
        ],
        // Builders and test helpers are stateless functions, so a test may pass several values to them.
        'max-params': 'off',
      },
    },
  );
}
