import {execFileSync} from 'node:child_process';
export function imageDigest(reference) {
  try {
    const digest = JSON.parse(
      execFileSync(
        'docker',
        ['buildx', 'imagetools', 'inspect', reference, '--format', '{{json .Manifest.Digest}}'],
        {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']},
      ),
    );
    if (!/^sha256:[a-f0-9]{64}$/.test(digest)) throw new Error('Invalid registry digest.');
    return digest;
  } catch (error) {
    if (/manifest unknown|not found|MANIFEST_UNKNOWN/i.test(String(error.stderr ?? '')))
      return null;
    throw error;
  }
}
