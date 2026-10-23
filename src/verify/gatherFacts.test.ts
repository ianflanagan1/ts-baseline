import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findProblems } from './findProblems.ts';
import { gatherFacts } from './gatherFacts.ts';

const fixture = (name: string): string => path.join(import.meta.dirname, '..', 'fixtures', name);

describe('gatherFacts', () => {
  it('reads a project that uses the baseline as one with no problems', async () => {
    expect(findProblems(await gatherFacts(fixture('conforming')))).toEqual([]);
  });

  it('reads what a project changed from the baseline through its real config files', async () => {
    expect(findProblems(await gatherFacts(fixture('departing')))).toEqual([
      'tsconfig.json: `exactOptionalPropertyTypes` must be true, as it is in @ianflanagan1/ts-baseline/tsconfig.json.',
      'ESLint: `@typescript-eslint/no-floating-promises` must be an error, as it is in the baseline.',
      'ESLint: `no-restricted-syntax` no longer bans `TSEnumDeclaration`; spread `bannedSyntax` into it.',
      'ESLint: `no-restricted-syntax` no longer bans `:function > AssignmentPattern`; spread `bannedSyntax` into it.',
      'ESLint: `no-restricted-syntax` no longer bans `:matches(:function, TSDeclareFunction, TSMethodSignature, TSFunctionType, TSEmptyBodyFunctionExpression) > Identifier[optional=true]`; spread `bannedSyntax` into it.',
      'ESLint: `no-restricted-syntax` no longer bans `TSPropertySignature[optional=true]`; spread `bannedSyntax` into it.',
      'Prettier: `printWidth` must be 140, as it is in @ianflanagan1/ts-baseline/prettier.',
      'No devbox.json: pin Node and the package manager in devbox, with scripts for setup, check, format and lint-file.',
      'package.json: pin the package manager with a `packageManager` field.',
    ]);
  });
});
