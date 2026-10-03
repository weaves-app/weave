import {validateBranch} from './policy.mjs';
export function evaluateTool(event, branch, confirmed) {
  const input =
    typeof event.tool_input === 'string'
      ? event.tool_input
      : JSON.stringify(event.tool_input ?? {});
  const patch = /apply_patch|Edit|Write/.test(event.tool_name ?? '');
  const source = /apps\/|packages\/|scripts\//.test(input);
  const commandWrite = /\b(sed\s+-i|tee|cp|mv)\b|\b(writeFile|write_text)\b|>/.test(input);
  if (source && (patch || commandWrite)) {
    const branchError = validateBranch(branch);
    if (branchError) return branchError;
    if (!confirmed)
      return 'Confirm BDD happy/sad/edge scenarios in workflow.json before implementation; specs and investigation are allowed.';
  }
  return null;
}
