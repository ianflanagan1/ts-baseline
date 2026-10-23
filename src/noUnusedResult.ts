import { ESLintUtils } from '@typescript-eslint/utils';
import ts from 'typescript';

const createRule = ESLintUtils.RuleCreator((name) => `https://github.com/ianflanagan1/ts-baseline#${name}`);

// A Result is recognised by shape, not by name, so this rule needs nothing from the code it checks:
// every member of the type has a boolean-literal `ok` and either a `value` or an `error`.
function isResult(type: ts.Type, checker: ts.TypeChecker): boolean {
  const members = type.isUnion() ? type.types : [type];
  return members.every((member) => isResultMember(member, checker));
}

function isResultMember(member: ts.Type, checker: ts.TypeChecker): boolean {
  const ok = member.getProperty('ok');
  if (ok === undefined) {
    return false;
  }
  const okType = checker.getTypeOfSymbol(ok);
  const okIsLiteral = (okType.flags & ts.TypeFlags.BooleanLiteral) !== 0;
  return okIsLiteral && (member.getProperty('value') !== undefined || member.getProperty('error') !== undefined);
}

export const noUnusedResult = createRule({
  name: 'no-unused-result',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow dropping a returned Result, so every expected failure is handled' },
    messages: {
      unusedResult: 'This Result is dropped. Handle it, return it, or discard it explicitly with `void`.',
    },
    schema: [],
    defaultOptions: [],
  },
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();
    return {
      ExpressionStatement(node) {
        if (isResult(services.getTypeAtLocation(node.expression), checker)) {
          context.report({ node, messageId: 'unusedResult' });
        }
      },
    };
  },
});
