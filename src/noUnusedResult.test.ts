import path from 'node:path';
import { afterAll, describe, it } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnusedResult } from './noUnusedResult.ts';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: path.join(import.meta.dirname, 'fixtures', 'noUnusedResult'),
    },
  },
});

const result = `
type Ok<T> = { readonly ok: true; readonly value: T };
type Err<E> = { readonly ok: false; readonly error: E };
type Result<T, E> = Ok<T> | Err<E>;
declare function parse(s: string): Result<number, 'bad'>;
declare function succeed(): Ok<number>;
declare function fail(): Err<'bad'>;
declare function sideEffect(): void;
declare function status(): { ok: boolean };
`;

ruleTester.run('no-unused-result', noUnusedResult, {
  valid: [
    { name: 'a Result that is assigned is used', code: `${result} const r = parse('1');` },
    { name: 'a Result that is returned is used', code: `${result} function f() { return parse('1'); }` },
    { name: 'a Result discarded with void is an explicit choice', code: `${result} void parse('1');` },
    { name: 'a call returning nothing may stand alone', code: `${result} sideEffect();` },
    { name: 'an object with ok but no value or error is not a Result', code: `${result} status();` },
  ],
  invalid: [
    { name: 'a dropped Result is reported', code: `${result} parse('1');`, errors: [{ messageId: 'unusedResult' }] },
    { name: 'a dropped Ok is reported', code: `${result} succeed();`, errors: [{ messageId: 'unusedResult' }] },
    { name: 'a dropped Err is reported', code: `${result} fail();`, errors: [{ messageId: 'unusedResult' }] },
    {
      name: 'a Result dropped inside a function body is reported',
      code: `${result} function f() { parse('1'); }`,
      errors: [{ messageId: 'unusedResult' }],
    },
  ],
});
