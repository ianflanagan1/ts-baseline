# @ianflanagan1/ts-baseline

One place for the static checks every TypeScript project of mine shares, so each project depends on them rather than copying them:

| Export                                         | What it is                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@ianflanagan1/ts-baseline/eslint`             | `baseline(tsconfigRootDir)`, an ESLint flat config: typescript-eslint's strict type-checked rules, exhaustive switches, bans on enums and default or optional parameters, React hooks and a11y rules for `.tsx`, test-only bans on module mocks and fake timers, and [`no-unused-result`](#no-unused-result). Also `bannedSyntax`, for a project that adds its own `no-restricted-syntax` entries. |
| `@ianflanagan1/ts-baseline/tsconfig.json`      | A strict tsconfig base for Node running TypeScript directly: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `erasableSyntaxOnly` and the rest.                                                                                                                                                                                                        |
| `@ianflanagan1/ts-baseline/prettier`           | The Prettier config.                                                                                                                                                                                                                                                                                                                                                                               |
| `@ianflanagan1/ts-baseline/dependency-cruiser` | dependency-cruiser rules for a project's `extends`: `core-is-pure`, which keeps `src/core/` from importing anything outside it, and `no-circular`.                                                                                                                                                                                                                                                 |
| `Taskfile.baseline.yml`                        | The `check`, `format` and `lint-file` tasks, for a project's Taskfile to include, so their commands arrive as a version bump.                                                                                                                                                                                                                                                                      |
| `ts-baseline verify [<dir>]`                   | Checks that a project still follows the baseline, and exits 1 with what to change when it doesn't.                                                                                                                                                                                                                                                                                                 |

## Use

```sh
pnpm add --save-dev @ianflanagan1/ts-baseline eslint prettier typescript
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

`tsconfig.json`: `{ "extends": "@ianflanagan1/ts-baseline/tsconfig.json" }`. `.prettierrc.json`: `"@ianflanagan1/ts-baseline/prettier"`. `.dependency-cruiser.js`: `export default { extends: '@ianflanagan1/ts-baseline/dependency-cruiser' }`, plus the project's own rules; a rule with a baseline rule's name changes only the fields it sets.

`Taskfile.yml`:

```yaml
includes:
  baseline:
    taskfile: ./node_modules/@ianflanagan1/ts-baseline/Taskfile.baseline.yml
    optional: true # setup installs it

tasks:
  setup:
    cmds:
      - pnpm install --frozen-lockfile
  check:
    cmds:
      - task: baseline:check # runs ts-baseline verify, so the project fails its own check when it drifts
  format:
    cmds:
      - task: baseline:format
  lint-file:
    cmds:
      - task: baseline:lint-file
```

New projects start from [ts-template](https://github.com/ianflanagan1/ts-template), which already does all of this.

## What `verify` checks

It reads the project's effective config, after `extends` and overrides, rather than its files' text, so it catches a rule turned off three blocks down as well as a missing file:

- the tsconfig turns on every strictness option the base does;
- the ESLint config applied to a `.ts` file has `no-unused-result`, `switch-exhaustiveness-check` (with `considerDefaultExhaustiveForUnions: false`), `no-floating-promises`, `only-throw-error`, `no-unnecessary-condition` and every banned syntax as errors;
- Prettier resolves to the same options;
- the dependency-cruiser config, after `extends`, has `core-is-pure` and `no-circular` as errors;
- `devbox.json` pins go-task and defines no scripts;
- the `Taskfile.yml` has `setup`, `check`, `format` and `lint-file` tasks, includes this package's `Taskfile.baseline.yml` (found by following the path, so any namespace works) without `dir` or excluding any of them, and has its own `check`, `format` and `lint-file` each run the baseline's, through `cmds` or `deps` and not with `ignore_error`;
- `package.json` pins `packageManager` and has dependency-cruiser, knip, vitest and this package;
- there's a lockfile and a knip config.

## Rules

### no-unused-result

Reports an expression statement whose value is a Result, so an expected failure can't be dropped by calling a function and ignoring what it returns. A Result is recognised by shape, so the rule needs nothing from the code it checks: every member of the type has a boolean-literal `ok` and either a `value` or an `error`. Discard one deliberately with `void`.

## Development

```sh
devbox run -- task setup
devbox run -- task check   # build, then the shared check: formatting, types, lint, dependency rules, knip, verify on itself, tests
```

The package includes its own `Taskfile.baseline.yml` and extends its own `dependency-cruiser.js`, as a project does through `node_modules`. dependency-cruiser loads `extends` by path rather than through package exports, which is why that file sits at the package root. The code follows the baseline it ships: `src/verify/findProblems.ts` decides from plain values, and `src/verify/gatherFacts.ts` reads the project through ESLint's, TypeScript's and Prettier's own config resolution.

Release with `github release . <patch|minor|major>` ([repo-tools](https://github.com/ianflanagan1/repo-tools)): `.github/workflows/publish.yml` publishes the tag's version to npm through the `publish` task, with provenance and no token. The first version, and npm's trust in the workflow, come from `npmjs publish .`. `prepack` builds `dist/` before each publish.
