import {readFileSync, appendFileSync} from 'node:fs';

export const NO_REPORTED_VULNERABILITIES = 0;

export const MAX_ALLOWED_CRITICAL_VULNERABILITIES = 0;

const audit = JSON.parse(readFileSync('dependency-audit.json', 'utf8'));

if (audit.error || !audit.metadata?.vulnerabilities)
  throw new Error('Dependency audit did not produce a valid report.');

const counts = audit.metadata.vulnerabilities;

const summary = `## Dependency audit\n\n| Severity | Reported findings |\n| --- | ---: |\n${['critical', 'high', 'moderate', 'low'].map((level) => `| ${level} | ${counts[level] ?? NO_REPORTED_VULNERABILITIES} |`).join('\n')}\n\nCounts follow the package manager’s audit report; they are not comparable across npm and pnpm. Critical findings block CI; other findings remain visible for remediation.\n`;

console.log(summary);

if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);

if (counts.critical > MAX_ALLOWED_CRITICAL_VULNERABILITIES) process.exitCode = 1;
