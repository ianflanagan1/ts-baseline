#!/usr/bin/env node
import path from 'node:path';
import { findProblems } from './verify/findProblems.ts';
import { gatherFacts } from './verify/gatherFacts.ts';

const usage = 'Usage: ts-baseline verify [<project dir>]';

async function run(args: ReadonlyArray<string>): Promise<number> {
  const [command, dir] = args;
  if (command !== 'verify' || args.length > 2) {
    console.error(usage);
    return 2;
  }
  const root = path.resolve(dir ?? '.');
  const problems = findProblems(await gatherFacts(root));
  if (problems.length === 0) {
    console.log(`ts-baseline: ${root} follows the baseline.`);
    return 0;
  }
  console.error(`ts-baseline: ${root} departs from the baseline:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  return 1;
}

async function main(): Promise<void> {
  try {
    process.exitCode = await run(process.argv.slice(2));
  } catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
  }
}

await main();
