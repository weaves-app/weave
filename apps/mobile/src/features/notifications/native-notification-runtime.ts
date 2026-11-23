import type {AuthStateReader} from '../../auth/application/auth-state-store';
import type {MonotonicClock} from './application/notification-ports';
import {createNativeNotificationGateway} from './infrastructure/native-notification-gateway';
import {createNativeNotificationTransport} from './infrastructure/native-notification-transport';
import {createNotificationRuntime} from './notification-runtime';
import type {NotificationRuntime} from './notification-runtime';

// Root leases are opaque ownership tags, never authentication credentials.
const processNonce = `${Date.now()}-${Math.random()}`;

let rootSequence = 0;

const monotonicClock: MonotonicClock = {
  now: () => performance.now(),

  schedule: (callback, delayMs) => {
    const timer = setTimeout(callback, delayMs);

    return () => clearTimeout(timer);
  },
};

export function createNativeNotificationRuntime(auth: AuthStateReader): NotificationRuntime {
  rootSequence += 1;

  return createNotificationRuntime(
    auth,
    createNativeNotificationGateway(createNativeNotificationTransport()),
    monotonicClock,
    `${processNonce}-${rootSequence}`,
  );
}
