import {readFileSync, appendFileSync} from 'node:fs';

const audit = JSON.parse(readFileSync('dependency-audit.json', 'utf8'));

if (audit.error || !audit.metadata?.vulnerabilities)
  throw new Error('Dependency audit did not produce a valid report.');

const counts = audit.metadata.vulnerabilities;

const summary = `## Dependency audit\n\n| Severity | Affected nodes |\n| --- | ---: |\n${['critical', 'high', 'moderate', 'low'].map((level) => `| ${level} | ${counts[level] ?? 0} |`).join('\n')}\n\nCounts include dependency-chain nodes, not distinct advisories. Critical findings block CI; other findings remain visible for remediation.\n`;

console.log(summary);

if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);

if (counts.critical > 0) process.exitCode = 1;
