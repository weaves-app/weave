import ts from 'typescript';

export const OPTION_NODE = {
  identifier: 'Identifier',
  member: 'MemberExpression',
};

function definition(node) {
  let current = node;

  while (current.parent) {
    const parent = current.parent;

    if (ts.isVariableDeclaration(parent) && parent.initializer === current) {
      const statement = parent.parent.parent;

      if (!ts.isVariableStatement(statement) || !(parent.parent.flags & ts.NodeFlags.Const))
        return false;

      return (
        Boolean(ts.getCombinedModifierFlags(statement) & ts.ModifierFlags.Export) ||
        statement
          .getSourceFile()
          .statements.some(
            (item) =>
              ts.isExportDeclaration(item) &&
              item.exportClause &&
              ts.isNamedExports(item.exportClause) &&
              item.exportClause.elements.some(
                (element) => (element.propertyName ?? element.name).text === parent.name.getText(),
              ),
          )
      );
    }

    if (!(
      ts.isPropertyAssignment(parent) ||
      ts.isObjectLiteralExpression(parent) ||
      ts.isArrayLiteralExpression(parent) ||
      ts.isAsExpression(parent) ||
      ts.isSatisfiesExpression(parent) ||
      ts.isParenthesizedExpression(parent)
    ))
      return false;

    current = parent;
  }

  return false;
}

export const optionConstantsRule = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {constant: 'Use an exported grouped constant for this typed option value.'},
  },

  create(context) {
    const services = context.sourceCode.parserServices;

    if (!services.program || !services.esTreeNodeToTSNodeMap) return {};

    const checker = services.program.getTypeChecker();

    function check(node) {
      const original = services.esTreeNodeToTSNodeMap.get(node);

      if (definition(original)) return;

      if (
        node.type === OPTION_NODE.identifier &&
        ((ts.isPropertyAssignment(original.parent) && original.parent.name === original) ||
          (ts.isPropertyAccessExpression(original.parent) && original.parent.name === original))
      )
        return;

      let type = checker.getContextualType(original);
      const parent = original.parent;

      if (!type && (ts.isParameter(parent) || ts.isVariableDeclaration(parent)) && parent.type)
        type = checker.getTypeFromTypeNode(parent.type);

      if (!type) return;

      const parts = (type.isUnion() ? type.types : [type]).filter(
        (part) =>
          !(
            part.flags &
            (ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.BooleanLiteral)
          ),
      );

      if (!parts.length || !parts.every((part) => part.flags & ts.TypeFlags.StringLiteral)) return;

      if (node.type === OPTION_NODE.identifier || node.type === OPTION_NODE.member) {
        const symbol = checker.getSymbolAtLocation(
          ts.isPropertyAccessExpression(original) ? original.name : original,
        );
        const declaration = symbol?.valueDeclaration;

        if (
          !declaration ||
          !(ts.isVariableDeclaration(declaration) || ts.isPropertyAssignment(declaration)) ||
          !declaration.initializer ||
          definition(declaration.initializer)
        )
          return;

        let initializer = declaration.initializer;

        while (
          ts.isAsExpression(initializer) ||
          ts.isSatisfiesExpression(initializer) ||
          ts.isParenthesizedExpression(initializer)
        )
          initializer = initializer.expression;

        if (!ts.isStringLiteralLike(initializer)) return;
      }

      context.report({node, messageId: 'constant'});
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') check(node);
      },

      TemplateLiteral(node) {
        if (!node.expressions.length) check(node);
      },

      MemberExpression(node) {
        check(node);
      },

      Identifier(node) {
        check(node);
      },
    };
  },
};
