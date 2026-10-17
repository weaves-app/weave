import {createHash} from 'node:crypto';
import {existsSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const iosRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../ios');

const projectPath = join(iosRoot, 'Weave.xcodeproj/project.pbxproj');

let project = readFileSync(projectPath, 'utf8');

const original = project;

export const MISSING_PROJECT_INDEX = -1;

function discover(directory, extensions) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, {withFileTypes: true})
    .flatMap((entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) return discover(path, extensions);

      return extensions.some((extension) => entry.name.endsWith(extension)) ? [path] : [];
    })
    .sort();
}

function identifier(value) {
  return createHash('sha256')
    .update(`weave-ios-contracts:${value}`)
    .digest('hex')
    .slice(0, 24)
    .toUpperCase();
}

function insertBefore(marker, value) {
  if (!project.includes(marker)) throw new Error(`Missing project marker: ${marker}`);

  project = project.replace(marker, `${value}${marker}`);
}

function appendToList(objectId, key, value) {
  const objectStart = project.search(
    new RegExp(`^\\t\\t${objectId}(?: /\\* .*? \\*/)? = \\{`, 'm'),
  );

  if (objectStart === MISSING_PROJECT_INDEX) throw new Error(`Missing project object: ${objectId}`);

  const listStart = project.indexOf(`\t\t\t${key} = (`, objectStart);
  const objectEnd = project.indexOf('\n\t\t};', objectStart);

  if (listStart === MISSING_PROJECT_INDEX || listStart > objectEnd)
    throw new Error(`Missing ${key} list in ${objectId}`);

  const listEnd = project.indexOf('\n\t\t\t);', listStart);

  if (listEnd > objectEnd) throw new Error(`Unterminated ${key} list in ${objectId}`);

  if (!project.slice(listStart, listEnd).includes(value)) {
    project = `${project.slice(0, listEnd)}\n\t\t\t\t${value}${project.slice(listEnd)}`;
  }
}

function addSource(path, phases) {
  const sourcePath = relative(iosRoot, path);
  const name = sourcePath.split('/').at(-1);
  const references = [
    ...project.matchAll(
      /([A-F0-9]{24}) \/\*[^\n]*\*\/ = \{isa = PBXFileReference;[^\n]*?path = ("[^"]+"|[^;]+);/g,
    ),
  ];
  const existingReference = references.find((match) => match[2].replaceAll('"', '') === sourcePath);
  const fileId = existingReference?.[1] ?? identifier(`file:${sourcePath}`);

  if (!existingReference) {
    if (project.includes(fileId)) throw new Error(`Project identifier collision: ${sourcePath}`);

    const fileType = name.endsWith('.swift') ? 'sourcecode.swift' : 'sourcecode.cpp.objcpp';

    insertBefore(
      '/* End PBXFileReference section */',
      `\t\t${fileId} /* ${name} */ = {isa = PBXFileReference; includeInIndex = 1; lastKnownFileType = ${fileType}; name = "${name}"; path = "${sourcePath}"; sourceTree = "<group>"; };\n`,
    );
    appendToList('83CBB9F61A601CBA00E9B192', 'children', `${fileId} /* ${name} */,`);
  }

  for (const phase of phases) {
    const buildReferences = [
      ...project.matchAll(
        /([A-F0-9]{24}) \/\*[^\n]*\*\/ = \{isa = PBXBuildFile; fileRef = ([A-F0-9]{24}) /g,
      ),
    ];
    const phaseStart = project.search(new RegExp(`^\\t\\t${phase}(?: /\\* .*? \\*/)? = \\{`, 'm'));
    const phaseEnd = project.indexOf('\n\t\t};', phaseStart);
    const existingBuild = buildReferences.find(
      (match) => match[2] === fileId && project.slice(phaseStart, phaseEnd).includes(match[1]),
    );

    if (existingBuild) continue;

    const buildId = identifier(`build:${phase}:${sourcePath}`);

    if (project.includes(buildId)) throw new Error(`Project identifier collision: ${sourcePath}`);

    insertBefore(
      '/* End PBXBuildFile section */',
      `\t\t${buildId} /* ${name} in Sources */ = {isa = PBXBuildFile; fileRef = ${fileId} /* ${name} */; };\n`,
    );
    appendToList(phase, 'files', `${buildId} /* ${name} in Sources */,`);
  }
}

// Preserve existing membership; add authored contract sources to both app and tests.
const appSources = '13B07F871A680F5B00A75B9A';

const testSources = '89EA6FE05CA0015491BC102B';

const sources = ['Weave/Auth', 'Weave/Notifications'].flatMap((directory) =>
  discover(join(iosRoot, directory), ['.swift', '.mm']),
);

for (const source of sources) {
  addSource(source, source.endsWith('.mm') ? [appSources] : [appSources, testSources]);
}

const tests = discover(join(iosRoot, 'WeaveTests'), ['.swift']).filter(
  (path) => !path.endsWith('/ClerkLoggingPrivacyProbe.swift'),
);

for (const test of tests) addSource(test, [testSources]);

if (process.argv.includes('--check') && project !== original) {
  throw new Error('iOS contract membership is stale; run node scripts/ios-contract-discovery.mjs.');
}

if (project !== original) writeFileSync(projectPath, project);

console.log(
  `iOS contracts: ${sources.length} sources and ${tests.length} test/support files discovered.`,
);
