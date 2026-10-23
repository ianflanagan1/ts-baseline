// Syntax the baseline bans, as `no-restricted-syntax` entries. A project that adds its own entries spreads these first,
// since its `no-restricted-syntax` replaces the baseline's rather than adding to it.
export const bannedSyntax: ReadonlyArray<{ readonly selector: string; readonly message: string }> = [
  { selector: 'TSEnumDeclaration', message: 'Use a union of string literals instead of an enum.' },
  { selector: ':function > AssignmentPattern', message: 'Do not declare default parameter values; every caller passes every argument.' },
  {
    selector:
      ':matches(:function, TSDeclareFunction, TSMethodSignature, TSFunctionType, TSEmptyBodyFunctionExpression) > Identifier[optional=true]',
    message: 'Do not declare optional parameters; every caller passes every argument.',
  },
  { selector: 'TSPropertySignature[optional=true]', message: 'Make every property required; use `| null` for an absent value.' },
];
