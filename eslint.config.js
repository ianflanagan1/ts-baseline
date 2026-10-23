// @ts-check
import { defineConfig } from 'eslint/config';
import { baseline } from './src/eslint.ts';

export default defineConfig({ ignores: ['src/fixtures/'] }, baseline(import.meta.dirname));
