import assert from 'node:assert/strict';
import {test} from 'node:test';

import {validateDependencyProposal} from '../../scripts/dependency-policy.mjs';

const proposal = {
  author: 'dependabot[bot]',
  sameRepository: true,
  base: 'develop',
  files: ['package-lock.json', 'apps/mobile/package.json'],
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
