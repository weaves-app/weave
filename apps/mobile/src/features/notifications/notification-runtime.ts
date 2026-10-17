import {SESSION_STATUS} from '../../auth/domain/auth-models';

import type {AuthStateReader} from '../../auth/application/auth-state-store';
import type {
  MonotonicClock,
  NotificationController,
  NotificationPlatform,
  NotificationStateReader,
} from './application/notification-ports';
import {createNotificationController} from './application/notification-controller';
import {createNotificationStateStore} from './infrastructure/zustand-notification-state-store';

export interface NotificationRuntime {
  readonly controller: NotificationController;
  readonly state: NotificationStateReader;
  dispose(): void;
}

export function createNotificationRuntime(
  auth: AuthStateReader,
  platform: NotificationPlatform,
  clock: MonotonicClock,
  rootLease: string,
): NotificationRuntime {
  const state = createNotificationStateStore();
  let controller: NotificationController | undefined;
  let unsubscribe: (() => void) | undefined;

  try {
    controller = createNotificationController(platform, state, clock, rootLease);

    const owned = controller;
    let previous = auth.getState();
    let generation = 0;
    let disposed = false;

    const reconcile = (): void => {
      const view = auth.getState();
      const session = view.session;

      generation += 1;
      owned.start(
        !view.pending &&
          session.status === SESSION_STATUS.ACTIVE &&
          session.sessionId &&
          session.accountId &&
          session.validatedAt !== undefined
          ? {rootLease, generation, sessionId: session.sessionId, accountId: session.accountId}
          : null,
        generation,
      );
    };

    unsubscribe = auth.subscribe(() => {
      try {
        const next = auth.getState();

        if (next.session === previous.session && next.pending === previous.pending) return;

        previous = next;
        reconcile();
      } catch {
        // External-store callbacks must not bypass React's auth recovery boundary.
        // A faulted authority is immediately ineligible for notifications.
        generation += 1;
        owned.start(null, generation);
      }
    });
    reconcile();

    return {
      controller: owned,
      state,

      dispose: () => {
        if (disposed) return;

        disposed = true;

        try {
          unsubscribe?.();
        } finally {
          try {
            owned.dispose();
          } finally {
            state.dispose();
          }
        }
      },
    };
  } catch (error: unknown) {
    try {
      unsubscribe?.();
    } finally {
      try {
        if (controller) controller.dispose();
        else platform.release(rootLease);
      } finally {
        state.dispose();
      }
    }

    throw error;
  }
}
