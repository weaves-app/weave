import {optionConstantsRule} from './option-constants.mjs';

export const OBJECT_EXPRESSION = 'ObjectExpression';

export const COMPARISON_OPERATORS = new Set(['===', '!==', '==', '!=', '<', '<=', '>', '>=']);

export const AST_KIND = {
  literal: 'Literal',
  template: 'TemplateLiteral',
  unary: 'UnaryExpression',
  identifier: 'Identifier',
  member: 'MemberExpression',
  property: 'Property',
  variable: 'Variable',
  exported: 'ExportNamedDeclaration',
  constant: 'const',
  jsxMember: 'JSXMemberExpression',
};

export const NAVIGATION_PROPS = {
  Screen: new Set(['name', 'navigationKey']),
  Group: new Set(['navigationKey']),
  Navigator: new Set(['initialRouteName']),
};

export const TYPEOF_OPERATOR = 'typeof';

export const FALLBACK_OPERATORS = new Set(['??', '||']);

export const SIGN_OPERATORS = new Set(['-', '+']);

export const STATIC_VALUE_TYPES = new Set(['string', 'number', 'bigint']);

export const EXPRESSION_WRAPPERS = new Set([
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
  'TSNonNullExpression',
  'ChainExpression',
  'JSXExpressionContainer',
]);

function unwrap(node) {
  while (node && EXPRESSION_WRAPPERS.has(node.type)) node = node.expression;

  return node;
}

function literal(node) {
  const value = unwrap(node);

  return (
    value &&
    ((value.type === AST_KIND.literal && STATIC_VALUE_TYPES.has(typeof value.value)) ||
      (value.type === AST_KIND.template && !value.expressions.length) ||
      (value.type === AST_KIND.unary &&
        SIGN_OPERATORS.has(value.operator) &&
        literal(value.argument)))
  );
}

export const comparisonConstantsRule = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      constant:
        'Use an exported named constant for this comparison, fallback, or navigation identifier.',
    },
  },

  create(context) {
    const source = context.sourceCode;

    function exported(name, declaration) {
      return (
        declaration.parent?.type === AST_KIND.exported ||
        source.ast.body.some(
          (statement) =>
            statement.type === AST_KIND.exported &&
            statement.specifiers.some((specifier) => specifier.local.name === name),
        )
      );
    }

    function localConstant(node) {
      const expression = unwrap(node);
      const identifier =
        expression?.type === AST_KIND.member ? unwrap(expression.object) : expression;

      if (identifier?.type !== AST_KIND.identifier) return false;

      let scope = source.getScope(identifier);
      let variable;

      while (scope && !variable) {
        variable = scope.set.get(identifier.name);
        scope = scope.upper;
      }

      const definition = variable?.defs.find((item) => item.type === AST_KIND.variable);

      if (!definition || definition.parent.kind !== AST_KIND.constant) return false;

      const value = unwrap(definition.node.init);
      const propertyName = expression.computed
        ? expression.property?.value
        : expression.property?.name;
      const property =
        value?.type === OBJECT_EXPRESSION
          ? value.properties.find(
              (item) =>
                item.type === AST_KIND.property &&
                (item.key.name ?? item.key.value) === propertyName,
            )
          : undefined;
      const isValue =
        expression.type === AST_KIND.member ? literal(property?.value) : literal(value);

      return isValue && !exported(identifier.name, definition.parent);
    }

    function check(node) {
      if (literal(node) || localConstant(node)) context.report({node, messageId: 'constant'});
    }

    return {
      JSXAttribute(node) {
        const component = node.parent.name;

        if (component.type !== AST_KIND.jsxMember) return;

        const properties = Object.hasOwn(NAVIGATION_PROPS, component.property.name)
          ? NAVIGATION_PROPS[component.property.name]
          : undefined;

        if (properties?.has(node.name.name) && node.value) check(node.value);
      },

      BinaryExpression(node) {
        if (!COMPARISON_OPERATORS.has(node.operator)) return;

        const left = unwrap(node.left);
        const right = unwrap(node.right);

        if (
          (left.type === AST_KIND.unary && left.operator === TYPEOF_OPERATOR) ||
          (right.type === AST_KIND.unary && right.operator === TYPEOF_OPERATOR)
        )
          return;

        check(node.left);
        check(node.right);
      },

      LogicalExpression(node) {
        if (FALLBACK_OPERATORS.has(node.operator)) check(node.right);
      },

      SwitchCase(node) {
        const discriminant = unwrap(node.parent.discriminant);

        if (discriminant.type === AST_KIND.unary && discriminant.operator === TYPEOF_OPERATOR)
          return;

        if (node.test) check(node.test);
      },
    };
  },
};

export const comparisonConstantsConfig = {
  files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
  ignores: ['**/vendor/**', '**/generated/**', '**/node_modules/**', '**/dist/**', '**/.next/**'],
  plugins: {
    'weave-values': {
      rules: {
        'no-literal-comparisons': comparisonConstantsRule,
        'no-inline-option-values': optionConstantsRule,
      },
    },
  },
  rules: {'weave-values/no-literal-comparisons': 'error'},
};
