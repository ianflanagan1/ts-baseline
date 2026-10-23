import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import prettier from 'prettier';
import ts from 'typescript';
import type { ProjectFacts, RuleSetting, Severity } from './findProblems.ts';

// Neither file exists: ESLint and Prettier only match the name against their globs and overrides.
const probeFile = 'ts-baseline-probe.ts';

// The package's own Prettier config, two levels up from both src/verify and dist/verify.
const expectedPrettierFile = fileURLToPath(new URL('../../prettier.json', import.meta.url));

export async function gatherFacts(dir: string): Promise<ProjectFacts> {
  const packageJson = await readJson(path.join(dir, 'package.json'));
  const devbox = await readJson(path.join(dir, 'devbox.json'));
  return {
    compilerOptions: compilerOptions(dir),
    eslintRules: await eslintRules(dir),
    prettierOptions: await prettier.resolveConfig(path.join(dir, probeFile), { editorconfig: false }),
    expectedPrettierOptions: recordAt(await readJson(expectedPrettierFile), []) ?? {},
    devboxScripts: devbox === null ? null : Object.keys(recordAt(devbox, ['shell', 'scripts']) ?? {}),
    packageName: stringAt(packageJson, ['name']),
    packageManager: stringAt(packageJson, ['packageManager']),
    devDependencies: Object.keys(recordAt(packageJson, ['devDependencies']) ?? {}),
    rootFiles: await readdir(dir),
  };
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
