export function pendingTaskMessage(task: string): string {
  return task === 'choose-organization'
    ? 'Your account setup requires organization membership before you can continue. Contact your workspace administrator.'
    : 'Your account requires an additional security step before you can continue. Contact your workspace administrator.';
}
