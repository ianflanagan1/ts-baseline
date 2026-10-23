import { bannedSyntax } from '../bannedSyntax.ts';

export type Severity = 'off' | 'warn' | 'error';

export type RuleSetting = { readonly severity: Severity; readonly options: ReadonlyArray<unknown> };

// What the shell found in a project. A null means the file or config wasn't there at all.
export type ProjectFacts = {
  readonly compilerOptions: Readonly<Record<string, unknown>> | null;
  readonly eslintRules: Readonly<Record<string, RuleSetting>> | null;
  readonly prettierOptions: Readonly<Record<string, unknown>> | null;
  readonly expectedPrettierOptions: Readonly<Record<string, unknown>>;
  readonly devboxScripts: ReadonlyArray<string> | null;
  readonly packageName: string | null;
  readonly packageManager: string | null;
  readonly devDependencies: ReadonlyArray<string>;
  readonly rootFiles: ReadonlyArray<string>;
};

const requiredCompilerOptions = [
  'strict',
  'noUncheckedIndexedAccess',
  'exactOptionalPropertyTypes',
  'noImplicitReturns',
  'noImplicitOverride',
  'noFallthroughCasesInSwitch',
  'verbatimModuleSyntax',
];

const requiredErrorRules = [
  'ts-baseline/no-unused-result',
  '@typescript-eslint/switch-exhaustiveness-check',
  '@typescript-eslint/no-floating-promises',
  '@typescript-eslint/only-throw-error',
  '@typescript-eslint/no-unnecessary-condition',
  'no-restricted-syntax',
];

const requiredDevboxScripts = ['setup', 'check', 'format', 'lint-file'];

const requiredDevDependencies = ['@ianflanagan1/ts-baseline', 'dependency-cruiser', 'knip', 'vitest'];

// Each entry is satisfied by any one of its files.
const requiredRootFiles: ReadonlyArray<{ readonly what: string; readonly anyOf: ReadonlyArray<string> }> = [
  { what: 'a committed lockfile', anyOf: ['pnpm-lock.yaml', 'package-lock.json'] },
  { what: 'a dependency-cruiser config', anyOf: ['.dependency-cruiser.js', '.dependency-cruiser.cjs', '.dependency-cruiser.mjs'] },
  { what: 'a knip config', anyOf: ['knip.json', 'knip.jsonc', '.knip.json', 'knip.config.ts'] },
];

// Every way the project falls short of the baseline, each phrased as what to change.
export function findProblems(facts: ProjectFacts): ReadonlyArray<string> {
  return [
    ...compilerOptionProblems(facts.compilerOptions),
    ...eslintProblems(facts.eslintRules),
    ...prettierProblems(facts.prettierOptions, facts.expectedPrettierOptions),
    ...devboxProblems(facts.devboxScripts),
    ...packageProblems(facts),
  ];
}

function compilerOptionProblems(options: Readonly<Record<string, unknown>> | null): ReadonlyArray<string> {
  if (options === null) {
    return ['No tsconfig.json at the project root: add one that extends @ianflanagan1/ts-baseline/tsconfig.json.'];
  }
  return requiredCompilerOptions
    .filter((name) => options[name] !== true)
    .map((name) => `tsconfig.json: \`${name}\` must be true, as it is in @ianflanagan1/ts-baseline/tsconfig.json.`);
}

function eslintProblems(rules: Readonly<Record<string, RuleSetting>> | null): ReadonlyArray<string> {
  if (rules === null) {
    return ['No ESLint config applies to TypeScript files: add an eslint.config.js that starts with `baseline(import.meta.dirname)`.'];
  }
  const weakened = requiredErrorRules
    .filter((name) => rules[name]?.severity !== 'error')
    .map((name) => `ESLint: \`${name}\` must be an error, as it is in the baseline.`);
  return [
    ...weakened,
    ...switchProblems(rules['@typescript-eslint/switch-exhaustiveness-check']),
    ...bannedSyntaxProblems(rules['no-restricted-syntax']),
  ];
}

function switchProblems(setting: RuleSetting | undefined): ReadonlyArray<string> {
  const options = setting?.options[0];
  const defaultIsNotExhaustive = isRecord(options) && options.considerDefaultExhaustiveForUnions === false;
  return defaultIsNotExhaustive
    ? []
    : ['ESLint: `@typescript-eslint/switch-exhaustiveness-check` must set `considerDefaultExhaustiveForUnions: false`.'];
}

function bannedSyntaxProblems(setting: RuleSetting | undefined): ReadonlyArray<string> {
  const selectors = (setting?.options ?? []).map((entry) => (isRecord(entry) ? entry.selector : entry));
  return bannedSyntax
    .filter((ban) => !selectors.includes(ban.selector))
    .map((ban) => `ESLint: \`no-restricted-syntax\` no longer bans \`${ban.selector}\`; spread \`bannedSyntax\` into it.`);
}

function prettierProblems(
  options: Readonly<Record<string, unknown>> | null,
  expected: Readonly<Record<string, unknown>>,
): ReadonlyArray<string> {
  if (options === null) {
    return ['No Prettier config: add a .prettierrc.json containing "@ianflanagan1/ts-baseline/prettier".'];
  }
  return Object.entries(expected)
    .filter(([name, value]) => options[name] !== value)
    .map(([name, value]) => `Prettier: \`${name}\` must be ${JSON.stringify(value)}, as it is in @ianflanagan1/ts-baseline/prettier.`);
}

function devboxProblems(scripts: ReadonlyArray<string> | null): ReadonlyArray<string> {
  if (scripts === null) {
    return ['No devbox.json: pin Node and the package manager in devbox, with scripts for setup, check, format and lint-file.'];
  }
  return requiredDevboxScripts.filter((name) => !scripts.includes(name)).map((name) => `devbox.json: add a \`${name}\` script.`);
}

function packageProblems(facts: ProjectFacts): ReadonlyArray<string> {
  const manager = facts.packageManager === null ? ['package.json: pin the package manager with a `packageManager` field.'] : [];
  // The baseline package checks itself, so being it counts as depending on it.
  const dependencies = requiredDevDependencies
    .filter((name) => name !== facts.packageName && !facts.devDependencies.includes(name))
    .map((name) => `package.json: add \`${name}\` to devDependencies.`);
  const files = requiredRootFiles
    .filter((required) => !required.anyOf.some((file) => facts.rootFiles.includes(file)))
    .map((required) => `Add ${required.what} at the project root (${required.anyOf.join(' or ')}).`);
  return [...manager, ...dependencies, ...files];
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}
