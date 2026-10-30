import { describe, expect, it } from 'vitest';
import { bannedSyntax } from '../bannedSyntax.ts';
import { aConformingProject } from '../testing/aProject.ts';
import { findProblems } from './findProblems.ts';

describe('findProblems', () => {
  it('finds nothing in a project that follows the baseline', () => {
    expect(findProblems(aConformingProject().build())).toEqual([]);
  });

  it('asks for a tsconfig when there is none', () => {
    expect(findProblems(aConformingProject().withCompilerOptions(null).build())).toEqual([
      'No tsconfig.json at the project root: add one that extends @ianflanagan1/ts-baseline/tsconfig.json.',
    ]);
  });

  it('reports a strictness option that is turned off or left out', () => {
    const facts = aConformingProject().withCompilerOption('strict', false).withCompilerOption('noImplicitOverride', undefined).build();
    expect(findProblems(facts)).toEqual([
      'tsconfig.json: `strict` must be true, as it is in @ianflanagan1/ts-baseline/tsconfig.json.',
      'tsconfig.json: `noImplicitOverride` must be true, as it is in @ianflanagan1/ts-baseline/tsconfig.json.',
    ]);
  });

  it('asks for the ESLint baseline when no config applies', () => {
    expect(findProblems(aConformingProject().withEslintRules(null).build())).toEqual([
      'No ESLint config applies to TypeScript files: add an eslint.config.js that starts with `baseline(import.meta.dirname)`.',
    ]);
  });

  it('reports a required rule that is weakened to a warning', () => {
    const facts = aConformingProject().withEslintRule('ts-baseline/no-unused-result', { severity: 'warn', options: [] }).build();
    expect(findProblems(facts)).toEqual(['ESLint: `ts-baseline/no-unused-result` must be an error, as it is in the baseline.']);
  });

  it('reports a switch check that lets a default arm cover a union', () => {
    const facts = aConformingProject()
      .withEslintRule('@typescript-eslint/switch-exhaustiveness-check', { severity: 'error', options: [{}] })
      .build();
    expect(findProblems(facts)).toEqual([
      'ESLint: `@typescript-eslint/switch-exhaustiveness-check` must set `considerDefaultExhaustiveForUnions: false`.',
    ]);
  });

  it('reports a banned syntax that a project dropped by replacing the list', () => {
    const facts = aConformingProject()
      .withEslintRule('no-restricted-syntax', { severity: 'error', options: bannedSyntax.slice(1) })
      .build();
    expect(findProblems(facts)).toEqual([
      'ESLint: `no-restricted-syntax` no longer bans `TSEnumDeclaration`; spread `bannedSyntax` into it.',
    ]);
  });

  it('accepts a banned syntax given as a bare selector string', () => {
    const facts = aConformingProject()
      .withEslintRule('no-restricted-syntax', { severity: 'error', options: bannedSyntax.map((ban) => ban.selector) })
      .build();
    expect(findProblems(facts)).toEqual([]);
  });

  it('reports a Prettier option that differs from the baseline', () => {
    const facts = aConformingProject().withPrettierOptions({ printWidth: 80, singleQuote: true, trailingComma: 'all' }).build();
    expect(findProblems(facts)).toEqual(['Prettier: `printWidth` must be 140, as it is in @ianflanagan1/ts-baseline/prettier.']);
  });

  it('asks for a Prettier config when there is none', () => {
    expect(findProblems(aConformingProject().withPrettierOptions(null).build())).toEqual([
      'No Prettier config: add a .prettierrc.json containing "@ianflanagan1/ts-baseline/prettier".',
    ]);
  });

  it('asks for devbox when the project has none', () => {
    expect(findProblems(aConformingProject().withDevbox(null).build())).toEqual([
      'No devbox.json: pin Node, the package manager and go-task in devbox.',
    ]);
  });

  it('asks for go-task when devbox does not pin it', () => {
    expect(
      findProblems(
        aConformingProject()
          .withDevbox({ packages: ['nodejs', 'pnpm'], scripts: [] })
          .build(),
      ),
    ).toEqual(['devbox.json: pin go-task, which runs the Taskfile.']);
  });

  it('asks for each devbox script to move into the Taskfile', () => {
    const facts = aConformingProject()
      .withDevbox({ packages: ['nodejs', 'pnpm', 'go-task'], scripts: ['check'] })
      .build();
    expect(findProblems(facts)).toEqual(['devbox.json: move the `check` script into a Taskfile task; devbox only pins tools.']);
  });

  it('asks for a Taskfile when the project has none', () => {
    expect(findProblems(aConformingProject().withTaskfile(null).build())).toEqual([
      "No Taskfile.yml: add one with setup, check, format and lint-file tasks, and include the baseline's tasks as `baseline`.",
    ]);
  });

  it('reports a missing task', () => {
    expect(findProblems(aConformingProject().withoutTask('lint-file').build())).toEqual(['Taskfile: add a `lint-file` task.']);
  });

  it("asks for the baseline's tasks when the Taskfile does not include them", () => {
    const facts = aConformingProject().withBaselineInclude(null).withTask('check', []).build();
    expect(findProblems(facts)).toEqual([
      "Taskfile: include the baseline's tasks: `includes: { baseline: { taskfile: ./node_modules/@ianflanagan1/ts-baseline/Taskfile.baseline.yml, optional: true } }`.",
      'Taskfile: have `check` run `task: baseline:check`.',
    ]);
  });

  it("reports a shared task that no longer runs the baseline's own", () => {
    const facts = aConformingProject().withTask('check', ['typecheck', 'test']).build();
    expect(findProblems(facts)).toEqual(['Taskfile: have `check` run `task: baseline:check`.']);
  });

  it('accepts the baseline included under another namespace', () => {
    const facts = aConformingProject()
      .withBaselineInclude({ namespace: 'shared', excludes: [], runsInProjectRoot: true })
      .withTask('check', ['shared:check'])
      .withTask('format', ['shared:format'])
      .withTask('lint-file', ['shared:lint-file'])
      .build();
    expect(findProblems(facts)).toEqual([]);
  });

  it('reports an include that leaves out a shared task', () => {
    const facts = aConformingProject()
      .withBaselineInclude({ namespace: 'baseline', excludes: ['check', 'setup'], runsInProjectRoot: true })
      .build();
    expect(findProblems(facts)).toEqual(["Taskfile: don't exclude `check` from the baseline's tasks."]);
  });

  it("reports an include that runs the baseline's tasks outside the project root", () => {
    const facts = aConformingProject().withBaselineInclude({ namespace: 'baseline', excludes: [], runsInProjectRoot: false }).build();
    expect(findProblems(facts)).toEqual([
      "Taskfile: drop `dir` from the baseline's include; its tasks check the directory they run in, which must be the project root.",
    ]);
  });

  it('asks for a dependency-cruiser config when there is none', () => {
    expect(findProblems(aConformingProject().withDependencyCruiserRules(null).build())).toEqual([
      'No dependency-cruiser config: add a .dependency-cruiser.js that extends @ianflanagan1/ts-baseline/dependency-cruiser.',
    ]);
  });

  it('reports a dependency rule that is weakened or dropped', () => {
    const facts = aConformingProject().withDependencyCruiserRules({ 'no-circular': 'warn' }).build();
    expect(findProblems(facts)).toEqual([
      'dependency-cruiser: `core-is-pure` must be an error, as it is in @ianflanagan1/ts-baseline/dependency-cruiser.',
      'dependency-cruiser: `no-circular` must be an error, as it is in @ianflanagan1/ts-baseline/dependency-cruiser.',
    ]);
  });

  it('reports an unpinned package manager and missing tools', () => {
    const facts = aConformingProject().withPackageManager(null).withDevDependencies(['@ianflanagan1/ts-baseline', 'vitest']).build();
    expect(findProblems(facts)).toEqual([
      'package.json: pin the package manager with a `packageManager` field.',
      'package.json: add `dependency-cruiser` to devDependencies.',
      'package.json: add `knip` to devDependencies.',
    ]);
  });

  it('counts the baseline package itself as depending on the baseline', () => {
    const facts = aConformingProject()
      .withPackageName('@ianflanagan1/ts-baseline')
      .withDevDependencies(['dependency-cruiser', 'knip', 'vitest'])
      .build();
    expect(findProblems(facts)).toEqual([]);
  });

  it('accepts any one of the files that can satisfy a requirement', () => {
    const facts = aConformingProject().withRootFiles(['package-lock.json', 'knip.config.ts']).build();
    expect(findProblems(facts)).toEqual([]);
  });

  it('reports missing root files', () => {
    expect(findProblems(aConformingProject().withRootFiles(['knip.json']).build())).toEqual([
      'Add a committed lockfile at the project root (pnpm-lock.yaml or package-lock.json).',
    ]);
  });
});
