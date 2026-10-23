// eslint-plugin-jsx-a11y ships no types. This declares only what eslint.config.js uses.
declare module 'eslint-plugin-jsx-a11y' {
  import type { ESLint, Linter } from 'eslint';

  const plugin: ESLint.Plugin & { readonly flatConfigs: { readonly recommended: { readonly rules: Linter.RulesRecord } } };
  export default plugin;
}
