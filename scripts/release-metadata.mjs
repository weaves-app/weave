import {execFileSync} from 'node:child_process';
import {appendFileSync, writeFileSync} from 'node:fs';
import {nextVersion} from './release-policy.mjs';
const git = (...args) => execFileSync('git', args, {encoding: 'utf8'}).trim();
const tags = git('tag', '--list', 'v*', '--sort=-version:refname')
  .split('\n')
  .filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag));
const head = git('rev-parse', 'HEAD');
const existing = tags.find((tag) => git('rev-parse', `${tag}^{commit}`) === head);
const previous = tags.find((tag) => tag !== existing);
if (previous) execFileSync('git', ['merge-base', '--is-ancestor', previous, 'HEAD']);
const range = previous ? `${previous}..HEAD` : 'HEAD';
const commits = git('log', '--no-merges', '--format=%s', range)
  .split('\n')
  .filter((value) => /^[a-z]+(?:\([^)]*\))?!?: /.test(value));
const version = existing?.slice(1) ?? nextVersion(previous?.slice(1) ?? '0.0.0', commits);
if (!version) throw new Error('No releasable commits.');
writeFileSync(
  'CHANGELOG.release.md',
  `# v${version}\n\nCommit: ${git('rev-parse', 'HEAD')}\n\n${commits.map((commit) => `- ${commit.replace(/\[(WEA-\d+)\]/g, '[$1](https://linear.app/weaveapp/issue/$1)')}`).join('\n')}\n`,
);
appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
