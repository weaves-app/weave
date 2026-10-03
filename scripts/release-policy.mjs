export function nextVersion(previous, commits) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(previous))
    throw new Error('Invalid stable SemVer');
  if (!commits.length) return null;
  let [major, minor, patch] = previous.split('.').map(Number);
  if (commits.some((commit) => /^[a-z]+(?:\([^)]*\))?!:/.test(commit))) {
    major++;
    minor = 0;
    patch = 0;
  } else if (commits.some((commit) => /^feat(?:\([^)]*\))?:/.test(commit))) {
    minor++;
    patch = 0;
  } else patch++;
  return `${major}.${minor}.${patch}`;
}
