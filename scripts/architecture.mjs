import ts from 'typescript';
import path from 'node:path';

// Inspects authored API constructors and imports. Module composition factories are
// deliberately outside the constructor rule; TypeScript checks their contracts.
export function inspectSources(sources, workspaceOptions = {}) {
  const files = Object.fromEntries(
    Object.entries(sources).map(([file, source]) => [path.resolve(file), source]),
  );
  const options = {
    strict: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.Node16,
    moduleResolution: ts.ModuleResolutionKind.Node16,
    experimentalDecorators: true,
    skipLibCheck: true,
  };

  const optionsForFile = (file) => {
    const relative = path.relative(process.cwd(), file).replaceAll(path.sep, '/');
    const root = /^(apps|packages)\/[^/]+/.exec(relative)?.[0];

    if (root && workspaceOptions[root])
      return {
        ...options,
        ...ts.parseJsonConfigFileContent(
          {compilerOptions: workspaceOptions[root]},
          ts.sys,
          path.resolve(root),
        ).options,
      };

    const config = ts.findConfigFile(path.dirname(file), ts.sys.fileExists);

    if (!config) return options;

    const json = ts.readConfigFile(config, ts.sys.readFile);

    if (json.error) throw new Error(ts.flattenDiagnosticMessageText(json.error.messageText, '\n'));

    return {
      ...options,
      ...ts.parseJsonConfigFileContent(json.config, ts.sys, path.dirname(config)).options,
    };
  };

  const host = ts.createCompilerHost(options);
  const read = host.readFile.bind(host);
  const exists = host.fileExists.bind(host);

  host.readFile = (file) => files[file] ?? read(file);
  host.fileExists = (file) => file in files || exists(file);

  const originalDirectoryExists = host.directoryExists.bind(host);

  host.directoryExists = (directory) =>
    Object.keys(files).some((file) => file.startsWith(directory + path.sep)) ||
    originalDirectoryExists(directory);
  host.getSourceFile = (file, version) => {
    const text = host.readFile(file);

    return text === undefined ? undefined : ts.createSourceFile(file, text, version, true);
  };

  const groups = new Map();
  const fileOptions = new Map();

  for (const file of Object.keys(files)) {
    const localOptions = optionsForFile(file);
    const key = JSON.stringify(localOptions);

    fileOptions.set(file, {key, options: localOptions});

    if (!groups.has(key)) groups.set(key, {options: localOptions, roots: []});

    groups.get(key).roots.push(file);
  }

  const programs = new Map();

  const programForFile = (file) => {
    const {key} = fileOptions.get(file);

    if (!programs.has(key)) {
      const group = groups.get(key);

      programs.set(key, ts.createProgram(group.roots, group.options, host));
    }

    return programs.get(key);
  };

  const errors = [];
  const edges = new Map();

  for (const file of Object.keys(files)) {
    const program = programForFile(file);
    const checker = program.getTypeChecker();
    const localOptions = fileOptions.get(file).options;
    const source = program.getSourceFile(file);
    const relative = path.relative(process.cwd(), file).replaceAll(path.sep, '/');
    const originModule = /\/modules\/([^/]+)\//.exec(relative)?.[1];
    const inner = /\/(domain|application)\//.test(relative);

    const report = (node, message) =>
      errors.push(
        `${relative}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${message}`,
      );

    const dependency = (node, specifier) => {
      const resolved = ts.resolveModuleName(specifier, file, localOptions, host).resolvedModule
        ?.resolvedFileName;
      const target = resolved
        ? path.relative(process.cwd(), resolved).replaceAll(path.sep, '/')
        : specifier.startsWith('.')
          ? path
              .relative(process.cwd(), path.resolve(path.dirname(file), specifier))
              .replaceAll(path.sep, '/')
          : specifier;

      if (resolved && resolved in files) edges.set(file, [...(edges.get(file) ?? []), resolved]);

      if (
        inner &&
        (/^@nestjs\//.test(specifier) ||
          /prisma|\/generated\/|\/(infrastructure|presentation)\//.test(target) ||
          /\.(controller|module)(?:\.ts)?$/.test(target))
      )
        report(node, 'Domain/application must depend inward through ports.');

      const targetModule = /\/modules\/([^/]+)\//.exec(target)?.[1];

      if (
        originModule &&
        targetModule &&
        targetModule !== originModule &&
        !/\/contracts\//.test(target)
      )
        report(node, 'Cross-module imports must use published contracts.');

      if (/^apps\/(web|mobile)\//.test(relative) && /apps\/api\//.test(target))
        report(node, 'Clients cannot import API internals.');
    };

    const visit = (node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        dependency(node, node.moduleSpecifier.text);

      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          node.expression.getText(source) === 'require')
      ) {
        if (node.arguments[0] && ts.isStringLiteral(node.arguments[0]))
          dependency(node, node.arguments[0].text);
        else report(node, 'Computed module imports require an explicit reviewed exception.');
      }

      if (relative.startsWith('apps/api/src/') && ts.isConstructorDeclaration(node)) {
        const decorated =
          ts.canHaveDecorators(node.parent) && (ts.getDecorators(node.parent)?.length ?? 0) > 0;

        for (const parameter of node.parameters) {
          const type = checker.getTypeAtLocation(parameter);
          const primitive =
            (type.flags &
              (ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BooleanLike)) !==
            0;
          const contract = (type.getSymbol()?.flags & ts.SymbolFlags.Interface) !== 0;

          if (!primitive && !contract)
            report(
              parameter,
              'Injected service parameters must be interfaces, not concrete classes or untyped values.',
            );

          if (
            decorated &&
            !primitive &&
            !(ts.getDecorators(parameter) ?? []).some(
              (d) =>
                ts.isCallExpression(d.expression) &&
                d.expression.expression.getText(source) === 'Inject',
            )
          )
            report(parameter, 'Decorated interface injection requires an explicit @Inject token.');
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(source);
  }

  const active = new Set();
  const done = new Set();

  const walk = (file) => {
    if (active.has(file)) {
      errors.push(`Import cycle: ${path.relative(process.cwd(), file)}`);

      return;
    }

    if (done.has(file)) return;

    active.add(file);

    for (const dependency of edges.get(file) ?? []) walk(dependency);

    active.delete(file);
    done.add(file);
  };

  for (const file of Object.keys(files)) walk(file);

  return errors;
}
