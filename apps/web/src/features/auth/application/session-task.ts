import {SESSION_TASK} from './auth-constants';

export function pendingTaskMessage(task: string): string {
  return task === SESSION_TASK.CHOOSE_ORGANIZATION
    ? 'Your account setup requires organization membership before you can continue. Contact your workspace administrator.'
    : 'Your account requires an additional security step before you can continue. Contact your workspace administrator.';
}
