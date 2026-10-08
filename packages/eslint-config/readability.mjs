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
    value.type === 'FunctionDeclaration' ||
    value.type === 'MethodDefinition' ||
    value.type === 'TSDeclareFunction' ||
    value.method ||
    ['ArrowFunctionExpression', 'FunctionExpression'].includes(value.value?.type) ||
    (value.type === 'VariableDeclaration' &&
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

                if (previous.type === 'ImportDeclaration' && next.type === 'ImportDeclaration') {
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
                      next.type === 'ReturnStatement' ||
                      next.type === 'ThrowStatement' ||
                      (previous.type === 'VariableDeclaration') !==
                        (next.type === 'VariableDeclaration')))
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
