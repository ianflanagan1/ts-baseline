import { bannedSyntax } from '../bannedSyntax.ts';
import type { ProjectFacts, RuleSetting } from '../verify/findProblems.ts';

const error = (...options: ReadonlyArray<unknown>): RuleSetting => ({ severity: 'error', options });

const prettier = { printWidth: 140, singleQuote: true, trailingComma: 'all' };

type ProjectBuilder = {
  readonly withCompilerOptions: (options: ProjectFacts['compilerOptions']) => ProjectBuilder;
  readonly withCompilerOption: (name: string, value: unknown) => ProjectBuilder;
  readonly withEslintRules: (rules: ProjectFacts['eslintRules']) => ProjectBuilder;
  readonly withEslintRule: (name: string, setting: RuleSetting) => ProjectBuilder;
  readonly withPrettierOptions: (options: ProjectFacts['prettierOptions']) => ProjectBuilder;
  readonly withDevboxScripts: (scripts: ProjectFacts['devboxScripts']) => ProjectBuilder;
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
    devboxScripts: ['setup', 'check', 'format', 'lint-file'],
    packageName: 'a-project',
    packageManager: 'pnpm@12.9.0',
    devDependencies: ['@ianflanagan1/ts-baseline', 'dependency-cruiser', 'knip', 'vitest'],
    rootFiles: ['pnpm-lock.yaml', '.dependency-cruiser.js', 'knip.json'],
  });
}

function builder(facts: ProjectFacts): ProjectBuilder {
  return {
    withCompilerOptions: (compilerOptions) => builder({ ...facts, compilerOptions }),
    withCompilerOption: (name, value) => builder({ ...facts, compilerOptions: { ...facts.compilerOptions, [name]: value } }),
    withEslintRules: (eslintRules) => builder({ ...facts, eslintRules }),
    withEslintRule: (name, setting) => builder({ ...facts, eslintRules: { ...facts.eslintRules, [name]: setting } }),
    withPrettierOptions: (prettierOptions) => builder({ ...facts, prettierOptions }),
    withDevboxScripts: (devboxScripts) => builder({ ...facts, devboxScripts }),
    withPackageName: (packageName) => builder({ ...facts, packageName }),
    withPackageManager: (packageManager) => builder({ ...facts, packageManager }),
    withDevDependencies: (devDependencies) => builder({ ...facts, devDependencies }),
    withRootFiles: (rootFiles) => builder({ ...facts, rootFiles }),
    build: () => facts,
  };
}
