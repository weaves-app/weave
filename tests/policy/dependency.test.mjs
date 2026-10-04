import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateDependencyProposal} from '../../scripts/dependency-policy.mjs';
const proposal = {
  author: 'dependabot[bot]',
  sameRepository: true,
  base: 'develop',
  files: ['pnpm-lock.yaml', 'apps/mobile/package.json'],
};
test('S17 dependency adoption accepts only genuine scoped proposals', () => {
  assert.equal(validateDependencyProposal(proposal), null);
  for (const change of [
    {author: 'someone'},
    {sameRepository: false},
    {base: 'main'},
    {files: ['apps/api/src/main.ts']},
    {files: []},
  ])
    assert.ok(validateDependencyProposal({...proposal, ...change}));
});

// WEA-8 S06: the public adoption seam permits the pnpm dependency lockfile only.
test('WEA-8 S06 accepts pnpm lockfile proposals without widening policy scope', () => {
  assert.equal(validateDependencyProposal({...proposal, files: ['pnpm-lock.yaml']}), null);
  for (const file of [
    'pnpm-workspace.yaml',
    '.npmrc',
    'nested/pnpm-lock.yaml',
    'apps/api/src/main.ts',
  ])
    assert.ok(validateDependencyProposal({...proposal, files: [file]}));
});
