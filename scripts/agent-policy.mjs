import {validateBranch} from './policy.mjs';

const sourcePath = (value) => /(?:^|[^a-zA-Z0-9_-])(?:apps|packages|scripts)\//.test(value);

// A conservative shell lexer: quoted JavaScript/operators are not shell redirects.
// This is feedback for recognized mutations, not a general shell security boundary.
function shellWritesSource(command) {
  const tokens = command.match(/"(?:\\.|[^"\\])*"|'[^']*'|(?:\d*>>?|[;&|])|[^\s><;&|]+/g) ?? [];

  const value = (token) => token?.replace(/^(['"])(.*)\1$/s, '$2');

  for (let i = 0; i < tokens.length; i++) {
    if (
      /^\d*>>?$/.test(tokens[i]) &&
      tokens[i + 1] !== '&' &&
      sourcePath(value(tokens[i + 1]) ?? '')
    )
      return true;

    if (['cp', 'mv', 'tee'].includes(tokens[i]) && (i === 0 || /[;&|]/.test(tokens[i - 1]))) {
      const args = [];

      for (let j = i + 1; j < tokens.length && !/^[;&|]$/.test(tokens[j]); j++)
        args.push(value(tokens[j]));

      // cp/mv read their first operand and write their destination; tee writes every file operand.
      if (tokens[i] === 'tee' ? args.some(sourcePath) : sourcePath(args.at(-1) ?? '')) return true;
    }
  }

  return (
    (/\b(?:writeFile(?:Sync)?|write_text)\b/.test(command) && sourcePath(command)) ||
    (/\bsed\s+-i\b/.test(command) && sourcePath(command))
  );
}

export function evaluateTool(event, branch, confirmed) {
  const input =
    typeof event.tool_input === 'string'
      ? event.tool_input
      : JSON.stringify(event.tool_input ?? {});
  const name = event.tool_name ?? '';
  const edit = /^(?:apply_patch|Edit|Write|MultiEdit|NotebookEdit)$/.test(name);
  const destinations =
    name === 'apply_patch'
      ? [...input.matchAll(/\*\*\* (?:Update File|Add File|Delete File|Move to): ([^\n"}]+)/g)].map(
          (match) => match[1],
        )
      : [
          event.tool_input?.file_path,
          event.tool_input?.path,
          event.tool_input?.notebook_path,
          ...(event.tool_input?.edits ?? []).map((entry) => entry.file_path),
        ];
  const mutation = edit
    ? destinations.some((destination) => typeof destination === 'string' && sourcePath(destination))
    : shellWritesSource(event.tool_input?.command ?? event.tool_input?.cmd ?? input);

  if (mutation) {
    const error = validateBranch(branch);

    if (error) return error;

    if (!confirmed)
      return 'Confirm BDD happy/sad/edge scenarios in workflow.json before implementation; specs and investigation are allowed.';
  }

  return null;
}

export function isScenarioConfirmed(state, branch) {
  return Boolean(
    state &&
    state.ticket === /WEA-\d+/.exec(branch)?.[0] &&
    state.scenariosConfirmed === true &&
    typeof state.confirmation === 'string' &&
    state.confirmation.length > 0 &&
    Array.isArray(state.scenarioIds) &&
    state.scenarioIds.length > 0,
  );
}
