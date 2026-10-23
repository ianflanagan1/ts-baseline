# @ianflanagan1/ts-baseline

One place for the static checks every TypeScript project of mine shares, so each project depends on them rather than copying them:

| Export                                    | What it is                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@ianflanagan1/ts-baseline/eslint`        | `baseline(tsconfigRootDir)`, an ESLint flat config: typescript-eslint's strict type-checked rules, exhaustive switches, bans on enums and default or optional parameters, React hooks and a11y rules for `.tsx`, test-only bans on module mocks and fake timers, and [`no-unused-result`](#no-unused-result). Also `bannedSyntax`, for a project that adds its own `no-restricted-syntax` entries. |
| `@ianflanagan1/ts-baseline/tsconfig.json` | A strict tsconfig base for Node running TypeScript directly: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `erasableSyntaxOnly` and the rest.                                                                                                                                                                                                        |
| `@ianflanagan1/ts-baseline/prettier`      | The Prettier config.                                                                                                                                                                                                                                                                                                                                                                               |
| `ts-baseline verify [<dir>]`              | Checks that a project still follows the baseline, and exits 1 with what to change when it doesn't.                                                                                                                                                                                                                                                                                                 |

## Use

```sh
pnpm add -D @ianflanagan1/ts-baseline eslint prettier typescript
```

`eslint.config.js`:

```js
// @ts-check
import { defineConfig } from 'eslint/config';
import { baseline } from '@ianflanagan1/ts-baseline/eslint';

export default defineConfig(baseline(import.meta.dirname), {
  // the project's own blocks: ignores, import restrictions for its core
});
```

`tsconfig.json`: `{ "extends": "@ianflanagan1/ts-baseline/tsconfig.json" }`. `.prettierrc.json`: `"@ianflanagan1/ts-baseline/prettier"`.

Add `ts-baseline verify` to the project's `check` script, so the project fails its own check, locally and in CI, when it drifts from the baseline.

New projects start from [ts-template](https://github.com/ianflanagan1/ts-template), which already does all of this.

## What `verify` checks

It reads the project's effective config, after `extends` and overrides, rather than its files' text, so it catches a rule turned off three blocks down as well as a missing file:

- the tsconfig turns on every strictness option the base does;
- the ESLint config applied to a `.ts` file has `no-unused-result`, `switch-exhaustiveness-check` (with `considerDefaultExhaustiveForUnions: false`), `no-floating-promises`, `only-throw-error`, `no-unnecessary-condition` and every banned syntax as errors;
- Prettier resolves to the same options;
- `devbox.json` has `setup`, `check`, `format` and `lint-file` scripts;
- `package.json` pins `packageManager` and has dependency-cruiser, knip, vitest and this package;
- there's a lockfile, a dependency-cruiser config and a knip config.

## Rules

### no-unused-result

Reports an expression statement whose value is a Result, so an expected failure can't be dropped by calling a function and ignoring what it returns. A Result is recognised by shape, so the rule needs nothing from the code it checks: every member of the type has a boolean-literal `ok` and either a `value` or an `error`. Discard one deliberately with `void`.

## Development

```sh
devbox run setup
devbox run check   # formatting, types, lint, dependency rules, knip, tests, verify on itself, build
```

The code follows the baseline it ships: `src/verify/findProblems.ts` decides from plain values, and `src/verify/gatherFacts.ts` reads the project through ESLint's, TypeScript's and Prettier's own config resolution.

Publish with `npm publish --access public`; `prepack` builds `dist/` first.
