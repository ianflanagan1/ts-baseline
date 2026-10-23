// @ts-check
import { defineConfig } from 'eslint/config';
import { baseline } from '../../eslint.ts';

export default defineConfig(baseline(import.meta.dirname));
