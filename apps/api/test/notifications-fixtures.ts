import type {AuthenticatedSession} from '../src/modules/authentication/application/session-authenticator';
import type {Clock} from '../src/modules/notifications/application/notification-ports';

export const notificationSession: AuthenticatedSession = {
  accountId: 'user_test_a',
  sessionId: 'sess_test_a',
  tokenExpiresAtSeconds: 2000000300,
};

export class NotificationTestClock implements Clock {
  time = 2000000000000;

  now(): number {
    return this.time;
  }
}
