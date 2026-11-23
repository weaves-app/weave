import type {
  MonotonicClock,
  NotificationPlatform,
  NotificationStateWriter,
} from '../application/notification-ports';
import type {
  NotificationContext,
  NotificationObservation,
  NotificationReadiness,
} from '../domain/notification-models';
import {
  INITIAL_NOTIFICATION_STATE,
  NOTIFICATION_PERMISSION,
  NOTIFICATION_RESULT,
} from '../domain/notification-models';

export function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
} {
  let resolve: (value: T) => void = () => undefined;

  let reject: (error: unknown) => void = () => undefined;

  const promise = new Promise<T>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });

  return {promise, resolve, reject};
}

export function fakeState(): NotificationStateWriter {
  let state = INITIAL_NOTIFICATION_STATE;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,

    getInitialState: () => INITIAL_NOTIFICATION_STATE,

    replace: (next) => {
      state = next;
      listeners.forEach((listener) => listener());
    },

    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    dispose: () => listeners.clear(),
  };
}

export class FakeClock implements MonotonicClock {
  time = 1000000;
  private readonly timers = new Set<{at: number; callback: () => void}>();

  now(): number {
    return this.time;
  }

  schedule(callback: () => void, delayMs: number): () => void {
    const timer = {at: this.time + delayMs, callback};

    this.timers.add(timer);

    return () => {
      this.timers.delete(timer);
    };
  }

  advance(ms: number): void {
    this.time += ms;

    for (const timer of [...this.timers]) {
      if (timer.at <= this.time) {
        this.timers.delete(timer);
        timer.callback();
      }
    }
  }
}

export const TEST_CONTEXT: NotificationContext = {
  rootLease: 'root-a',
  generation: 1,
  sessionId: 'session-a',
  accountId: 'account-a',
};

export function fakePlatform(): NotificationPlatform & {
  emit: (value: NotificationObservation) => void;
} {
  const listeners = new Set<(value: NotificationObservation) => void>();
  const observation: NotificationObservation = {
    rootLease: 'root-a',
    generation: 1,
    revision: 1,
    permission: NOTIFICATION_PERMISSION.UNDETERMINED,
    canRequest: true,
    registrationPresent: false,
    enabled: false,
    matchesCurrentAccount: false,
  };

  return {
    acquire: jest.fn(),
    release: jest.fn(),

    observe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    reconcile: jest.fn(async (context: NotificationContext | null) => ({
      ...observation,
      ...(context ?? {}),
    })),
    enable: jest.fn(async (context: NotificationContext) => ({...observation, ...context})),
    openSettings: jest.fn(async () => undefined),
    checkReadiness: jest.fn(
      async (
        context: NotificationContext,
        revision: number,
        attemptId: string,
      ): Promise<NotificationReadiness> => ({
        ...context,
        revision,
        attemptId,
        status: NOTIFICATION_RESULT.PENDING,
        remainingValidityMs: 0,
      }),
    ),

    emit: (value) => listeners.forEach((listener) => listener(value)),
  };
}
