// @ts-check
import { defineConfig } from 'eslint/config';
import { baseline } from '../../eslint.ts';

export default defineConfig(baseline(import.meta.dirname), {
  rules: {
    '@typescript-eslint/no-floating-promises': 'warn',
    'no-restricted-syntax': [
      'error',
      { selector: 'WithStatement', message: 'No with.' },
    ],
  },
});
