import { bannedSyntax } from '../bannedSyntax.ts';
import type { BaselineInclude, ProjectFacts, RuleSetting, TaskfileFacts } from '../verify/findProblems.ts';

const error = (...options: ReadonlyArray<unknown>): RuleSetting => ({ severity: 'error', options });

const prettier = { printWidth: 140, singleQuote: true, trailingComma: 'all' };

type ProjectBuilder = {
  readonly withCompilerOptions: (options: ProjectFacts['compilerOptions']) => ProjectBuilder;
  readonly withCompilerOption: (name: string, value: unknown) => ProjectBuilder;
  readonly withEslintRules: (rules: ProjectFacts['eslintRules']) => ProjectBuilder;
  readonly withEslintRule: (name: string, setting: RuleSetting) => ProjectBuilder;
  readonly withPrettierOptions: (options: ProjectFacts['prettierOptions']) => ProjectBuilder;
  readonly withDevbox: (devbox: ProjectFacts['devbox']) => ProjectBuilder;
  readonly withTaskfile: (taskfile: ProjectFacts['taskfile']) => ProjectBuilder;
  readonly withTask: (name: string, runs: ReadonlyArray<string>) => ProjectBuilder;
  readonly withoutTask: (name: string) => ProjectBuilder;
  readonly withBaselineInclude: (include: BaselineInclude | null) => ProjectBuilder;
  readonly withDependencyCruiserRules: (rules: ProjectFacts['dependencyCruiserRules']) => ProjectBuilder;
  readonly withPackageName: (name: string | null) => ProjectBuilder;
  readonly withPackageManager: (manager: string | null) => ProjectBuilder;
  readonly withDevDependencies: (names: ReadonlyArray<string>) => ProjectBuilder;
  readonly withRootFiles: (names: ReadonlyArray<string>) => ProjectBuilder;
  readonly build: () => ProjectFacts;
};

// Facts about a project that follows the baseline in full; each `with…` changes one thing.
export function aConformingProject(): ProjectBuilder {
  return builder({
    compilerOptions: {
      strict: true,
      noUncheckedIndexedAccess: true,
      exactOptionalPropertyTypes: true,
      noImplicitReturns: true,
      noImplicitOverride: true,
      noFallthroughCasesInSwitch: true,
      verbatimModuleSyntax: true,
    },
    eslintRules: {
      'ts-baseline/no-unused-result': error(),
      '@typescript-eslint/switch-exhaustiveness-check': error({ considerDefaultExhaustiveForUnions: false }),
      '@typescript-eslint/no-floating-promises': error(),
      '@typescript-eslint/only-throw-error': error(),
      '@typescript-eslint/no-unnecessary-condition': error(),
      'no-restricted-syntax': error(...bannedSyntax),
    },
    prettierOptions: prettier,
    expectedPrettierOptions: prettier,
    devbox: { packages: ['nodejs', 'pnpm', 'go-task'], scripts: [] },
    taskfile: {
      tasks: { setup: [], check: ['baseline:check'], format: ['baseline:format'], 'lint-file': ['baseline:lint-file'] },
      baselineInclude: { namespace: 'baseline', excludes: [], runsInProjectRoot: true },
    },
    dependencyCruiserRules: { 'core-is-pure': 'error', 'no-circular': 'error' },
    packageName: 'a-project',
    packageManager: 'pnpm@12.9.0',
    devDependencies: ['@ianflanagan1/ts-baseline', 'dependency-cruiser', 'knip', 'vitest'],
    rootFiles: ['pnpm-lock.yaml', 'knip.json'],
  });
}

function builder(facts: ProjectFacts): ProjectBuilder {
  return {
    withCompilerOptions: (compilerOptions) => builder({ ...facts, compilerOptions }),
    withCompilerOption: (name, value) => builder({ ...facts, compilerOptions: { ...facts.compilerOptions, [name]: value } }),
    withEslintRules: (eslintRules) => builder({ ...facts, eslintRules }),
    withEslintRule: (name, setting) => builder({ ...facts, eslintRules: { ...facts.eslintRules, [name]: setting } }),
    withPrettierOptions: (prettierOptions) => builder({ ...facts, prettierOptions }),
    withDevbox: (devbox) => builder({ ...facts, devbox }),
    withTaskfile: (taskfile) => builder({ ...facts, taskfile }),
    withTask: (name, runs) => withTaskfile(facts, (taskfile) => ({ ...taskfile, tasks: { ...taskfile.tasks, [name]: runs } })),
    withoutTask: (name) =>
      withTaskfile(facts, (taskfile) => ({
        ...taskfile,
        tasks: Object.fromEntries(Object.entries(taskfile.tasks).filter(([task]) => task !== name)),
      })),
    withBaselineInclude: (baselineInclude) => withTaskfile(facts, (taskfile) => ({ ...taskfile, baselineInclude })),
    withDependencyCruiserRules: (dependencyCruiserRules) => builder({ ...facts, dependencyCruiserRules }),
    withPackageName: (packageName) => builder({ ...facts, packageName }),
    withPackageManager: (packageManager) => builder({ ...facts, packageManager }),
    withDevDependencies: (devDependencies) => builder({ ...facts, devDependencies }),
    withRootFiles: (rootFiles) => builder({ ...facts, rootFiles }),
    build: () => facts,
  };
}

// Changes the Taskfile, or starts from an empty one when the project has none.
function withTaskfile(facts: ProjectFacts, change: (taskfile: TaskfileFacts) => TaskfileFacts): ProjectBuilder {
  return builder({ ...facts, taskfile: change(facts.taskfile ?? { tasks: {}, baselineInclude: null }) });
}
