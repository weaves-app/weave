export function validateBranch(branch) {
  return /^(feat|fix|bugfix|hotfix)\/WEA-[1-9]\d*\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(branch)
    ? null
    : 'Use feat|fix|bugfix|hotfix/WEA-N/slug; shared branches are read-only.';
}

const verbs = new Set([
  'add',
  'fix',
  'repair',
  'remove',
  'update',
  'set',
  'configure',
  'refactor',
  'document',
  'test',
  'build',
  'release',
  'revert',
  'implement',
  'enable',
  'disable',
  'bump',
  'restore',
  'prevent',
  'align',
  'create',
  'improve',
  'support',
  'use',
  'extract',
  'replace',
  'rename',
]);

export function validateCommit(message) {
  const match =
    /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(?:\([a-z0-9-]+\))?!?: ([a-z]+) .+ \[WEA-[1-9]\d*\]$/.exec(
      message,
    );

  return !/[\r\n]/.test(message) && match && verbs.has(match[2]) && message.length <= 100
    ? null
    : 'Use one imperative Conventional Commit, <=100 characters, ending [WEA-N]; see approved verbs in scripts/policy.mjs.';
}

export function validatePullRequest({base, head, sameRepository}) {
  if (!sameRepository) return 'Working/release PRs must originate in this repository.';

  if (base === 'main') return head === 'develop' ? null : 'Only develop may release into main.';

  if (base === 'develop') return validateBranch(head);

  return 'PR target must be develop or main.';
}

export function validateGithubAccount(expected, actual, forbidden = []) {
  return expected &&
    !forbidden.some((identity) => identity.toLowerCase() === expected.toLowerCase()) &&
    expected.toLowerCase() === actual?.toLowerCase()
    ? null
    : `Refusing publication: expected personal GitHub account ${expected || '(unset)'}, authenticated as ${actual || '(unknown)'}.`;
}
