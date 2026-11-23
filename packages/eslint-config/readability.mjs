export const FUNCTION_DECLARATION = 'FunctionDeclaration';

export const METHOD_DEFINITION = 'MethodDefinition';

export const TS_DECLARE_FUNCTION = 'TSDeclareFunction';

export const VARIABLE_DECLARATION = 'VariableDeclaration';

export const IMPORT_DECLARATION = 'ImportDeclaration';

export const RETURN_STATEMENT = 'ReturnStatement';

export const THROW_STATEMENT = 'ThrowStatement';

function importGroup(node) {
  const source = node.source.value;

  if (source.startsWith('.')) return 'local';

  if (source.startsWith('@weave/')) return 'workspace';

  return 'external';
}

function unwrap(node) {
  return node.declaration ?? node;
}

function callable(node) {
  const value = unwrap(node);

  return (
    value.type === FUNCTION_DECLARATION ||
    value.type === METHOD_DEFINITION ||
    value.type === TS_DECLARE_FUNCTION ||
    value.method ||
    ['ArrowFunctionExpression', 'FunctionExpression'].includes(value.value?.type) ||
    (value.type === VARIABLE_DECLARATION &&
      value.declarations.some((declaration) =>
        ['ArrowFunctionExpression', 'FunctionExpression'].includes(declaration.init?.type),
      ))
  );
}

function control(node) {
  return [
    'IfStatement',
    'TryStatement',
    'SwitchStatement',
    'ForStatement',
    'ForOfStatement',
    'ForInStatement',
    'WhileStatement',
    'DoWhileStatement',
  ].includes(node.type);
}

export const readabilityConfig = {
  plugins: {
    weave: {
      rules: {
        readability: {
          meta: {
            type: 'layout',
            fixable: 'whitespace',
            schema: [],
            messages: {separate: 'Add a blank line between these logical blocks.'},
          },

          create(context) {
            const source = context.sourceCode;

            function separate(previous, next) {
              const comments = source
                .getCommentsBefore(next)
                .filter((comment) => comment.loc.start.line > previous.loc.end.line);
              const declaration = unwrap(next);
              const decorator = declaration.decorators?.[0];
              const target = comments[0] ?? decorator ?? next;
              const gap = source.text.slice(previous.range[1], target.range[0]);

              if (/\n[ \t]*\r?\n/.test(gap)) return;

              context.report({
                node: next,
                messageId: 'separate',

                fix: (fixer) =>
                  fixer.insertTextBefore(
                    target,
                    target.loc.start.line === previous.loc.end.line ? '\n\n' : '\n',
                  ),
              });
            }

            function check(nodes, topLevel = false, members = false) {
              for (let index = 1; index < nodes.length; index += 1) {
                const previous = nodes[index - 1];
                const next = nodes[index];

                if (previous.type === IMPORT_DECLARATION && next.type === IMPORT_DECLARATION) {
                  if (importGroup(previous) !== importGroup(next)) separate(previous, next);

                  continue;
                }

                if (
                  topLevel ||
                  callable(previous) ||
                  callable(next) ||
                  (!members &&
                    (control(previous) ||
                      control(next) ||
                      next.type === RETURN_STATEMENT ||
                      next.type === THROW_STATEMENT ||
                      (previous.type === VARIABLE_DECLARATION) !==
                        (next.type === VARIABLE_DECLARATION)))
                ) {
                  separate(previous, next);
                }
              }
            }

            return {
              Program: (node) => check(node.body, true),

              BlockStatement: (node) => check(node.body),

              ClassBody: (node) => check(node.body, false, true),

              ObjectExpression: (node) => check(node.properties, false, true),
            };
          },
        },
      },
    },
  },
  rules: {'weave/readability': 'error'},
};
