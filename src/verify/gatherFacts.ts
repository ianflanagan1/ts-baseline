import { existsSync } from 'node:fs';
import { readdir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import extractDepcruiseConfig from 'dependency-cruiser/config-utl/extract-depcruise-config';
import { ESLint } from 'eslint';
import prettier from 'prettier';
import ts from 'typescript';
import { parse as parseYaml } from 'yaml';
import type { BaselineInclude, DevboxFacts, ProjectFacts, RuleSetting, Severity, TaskfileFacts } from './findProblems.ts';

// Neither file exists: ESLint and Prettier only match the name against their globs and overrides.
const probeFile = 'ts-baseline-probe.ts';

// The package's own Prettier config, two levels up from both src/verify and dist/verify.
const expectedPrettierFile = fileURLToPath(new URL('../../prettier.json', import.meta.url));

// The package's own Taskfile of shared tasks, beside the Prettier config.
const baselineTaskfileFile = fileURLToPath(new URL('../../Taskfile.baseline.yml', import.meta.url));

// The names dependency-cruiser looks for, in its order.
const dependencyCruiserConfigNames = [
  '.dependency-cruiser.json',
  '.dependency-cruiser.js',
  '.dependency-cruiser.cjs',
  '.dependency-cruiser.mjs',
  '.dependency-cruiser.ts',
  '.dependency-cruiser.cts',
  '.dependency-cruiser.mts',
];

// The names Task looks for, in its order.
const taskfileNames = [
  'Taskfile.yml',
  'taskfile.yml',
  'Taskfile.yaml',
  'taskfile.yaml',
  'Taskfile.dist.yml',
  'taskfile.dist.yml',
  'Taskfile.dist.yaml',
  'taskfile.dist.yaml',
];

export async function gatherFacts(dir: string): Promise<ProjectFacts> {
  const packageJson = await readJson(path.join(dir, 'package.json'));
  const devbox = await readJson(path.join(dir, 'devbox.json'));
  const rootFiles = await readdir(dir);
  return {
    compilerOptions: compilerOptions(dir),
    eslintRules: await eslintRules(dir),
    prettierOptions: await prettier.resolveConfig(path.join(dir, probeFile), { editorconfig: false }),
    expectedPrettierOptions: recordAt(await readJson(expectedPrettierFile), []) ?? {},
    devbox: devbox === null ? null : devboxFacts(devbox),
    taskfile: await taskfileFacts(dir, rootFiles),
    dependencyCruiserRules: await dependencyCruiserRules(dir, rootFiles),
    packageName: stringAt(packageJson, ['name']),
    packageManager: stringAt(packageJson, ['packageManager']),
    devDependencies: Object.keys(recordAt(packageJson, ['devDependencies']) ?? {}),
    rootFiles,
  };
}

// devbox.json lists packages as `name@version` strings, or as an object from name to version.
function devboxFacts(devbox: unknown): DevboxFacts {
  const listed = valueAt(devbox, ['packages']);
  const packages = Array.isArray(listed)
    ? listed.filter((entry) => typeof entry === 'string').map((entry) => entry.split('@')[0] ?? entry)
    : Object.keys(recordAt(devbox, ['packages']) ?? {});
  return { packages, scripts: Object.keys(recordAt(devbox, ['shell', 'scripts']) ?? {}) };
}

async function taskfileFacts(dir: string, rootFiles: ReadonlyArray<string>): Promise<TaskfileFacts | null> {
  const name = taskfileNames.find((candidate) => rootFiles.includes(candidate));
  if (name === undefined) {
    return null;
  }
  const taskfile: unknown = parseYaml(await readFile(path.join(dir, name), 'utf8'));
  const tasks = Object.entries(recordAt(taskfile, ['tasks']) ?? {}).map(([task, definition]): [string, ReadonlyArray<string>] => [
    task,
    tasksRun(definition),
  ]);
  return { tasks: Object.fromEntries(tasks), baselineInclude: await baselineInclude(dir, recordAt(taskfile, ['includes']) ?? {}) };
}

// The tasks a task runs: its `task:` cmds and its deps. One that ignores errors runs none that count, since a
// failure there no longer fails it. A task may also be written as just its list of cmds.
function tasksRun(definition: unknown): ReadonlyArray<string> {
  if (valueAt(definition, ['ignore_error']) === true) {
    return [];
  }
  const cmds = Array.isArray(definition) ? definition : arrayAt(definition, ['cmds']);
  const fromCmds = cmds.filter((cmd) => valueAt(cmd, ['ignore_error']) !== true).map((cmd) => stringAt(cmd, ['task']));
  const fromDeps = arrayAt(definition, ['deps']).map((dep) => (typeof dep === 'string' ? dep : stringAt(dep, ['task'])));
  return [...fromCmds, ...fromDeps].filter((task) => task !== null);
}

// The include whose file is this package's Taskfile, followed through pnpm's symlinks; an include is a path or
// an object with a `taskfile` path.
async function baselineInclude(dir: string, includes: Readonly<Record<string, unknown>>): Promise<BaselineInclude | null> {
  const expected = await realpath(baselineTaskfileFile);
  const candidates = await Promise.all(
    Object.entries(includes).map(async ([namespace, entry]) => {
      const file = typeof entry === 'string' ? entry : stringAt(entry, ['taskfile']);
      const resolved = file === null ? null : path.resolve(dir, file);
      const matches = resolved !== null && existsSync(resolved) && (await realpath(resolved)) === expected;
      return matches ? includeFacts(dir, namespace, entry) : null;
    }),
  );
  return candidates.find((candidate) => candidate !== null) ?? null;
}

function includeFacts(dir: string, namespace: string, entry: unknown): BaselineInclude {
  const includeDir = stringAt(entry, ['dir']);
  return {
    namespace,
    excludes: arrayAt(entry, ['excludes']).filter((name) => typeof name === 'string'),
    runsInProjectRoot: includeDir === null || path.resolve(dir, includeDir) === path.resolve(dir),
  };
}

// The effective forbidden rules, after `extends`, by name with their severity. dependency-cruiser treats a rule
// without one as a warning.
async function dependencyCruiserRules(dir: string, rootFiles: ReadonlyArray<string>): Promise<Readonly<Record<string, Severity>> | null> {
  const name = dependencyCruiserConfigNames.find((candidate) => rootFiles.includes(candidate));
  if (name === undefined) {
    return null;
  }
  const config = await extractDepcruiseConfig(path.join(dir, name), new Set(), dir);
  const rules = (config.forbidden ?? []).map((rule): [string, Severity] => [
    rule.name ?? '',
    dependencyCruiserSeverity(rule.severity ?? 'warn'),
  ]);
  return Object.fromEntries(rules);
}

function dependencyCruiserSeverity(value: string): Severity {
  switch (value) {
    case 'error':
      return 'error';
    case 'warn':
      return 'warn';
    default:
      return 'off';
  }
}

function compilerOptions(dir: string): Readonly<Record<string, unknown>> | null {
  const file = path.join(dir, 'tsconfig.json');
  if (!existsSync(file)) {
    return null;
  }
  const config: unknown = ts.readConfigFile(file, (name) => ts.sys.readFile(name)).config;
  return ts.parseJsonConfigFileContent(config, ts.sys, dir).options;
}

async function eslintRules(dir: string): Promise<Readonly<Record<string, RuleSetting>> | null> {
  const eslint = new ESLint({ cwd: dir });
  if ((await eslint.findConfigFile()) === undefined) {
    return null;
  }
  const config: unknown = await eslint.calculateConfigForFile(path.join(dir, probeFile));
  const rules = recordAt(config, ['rules']);
  if (rules === null) {
    return null;
  }
  return Object.fromEntries(Object.entries(rules).map(([name, entry]) => [name, ruleSetting(entry)]));
}

// ESLint reports each rule as `[severity, ...options]`, the severity as 0-2 or its name.
function ruleSetting(entry: unknown): RuleSetting {
  const parts: ReadonlyArray<unknown> = Array.isArray(entry) ? entry : [entry];
  const [severity, ...options] = parts;
  return { severity: severityOf(severity), options };
}

function severityOf(value: unknown): Severity {
  switch (value) {
    case 2:
    case 'error':
      return 'error';
    case 1:
    case 'warn':
      return 'warn';
    default:
      return 'off';
  }
}

// devbox.json may hold comments, so both files go through TypeScript's tolerant JSON reader.
async function readJson(file: string): Promise<unknown> {
  if (!existsSync(file)) {
    return null;
  }
  const parsed = ts.parseConfigFileTextToJson(file, await readFile(file, 'utf8'));
  if (parsed.error !== undefined) {
    throw new Error(`${file} is not valid JSON: ${ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n')}`);
  }
  const config: unknown = parsed.config;
  return config;
}

function valueAt(value: unknown, keys: ReadonlyArray<string>): unknown {
  return keys.reduce<unknown>((current, key) => (isRecord(current) ? current[key] : undefined), value);
}

function arrayAt(value: unknown, keys: ReadonlyArray<string>): ReadonlyArray<unknown> {
  const found = valueAt(value, keys);
  return Array.isArray(found) ? found : [];
}

function recordAt(value: unknown, keys: ReadonlyArray<string>): Readonly<Record<string, unknown>> | null {
  const found = valueAt(value, keys);
  return isRecord(found) ? found : null;
}

function stringAt(value: unknown, keys: ReadonlyArray<string>): string | null {
  const found = valueAt(value, keys);
  return typeof found === 'string' ? found : null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
