import type {
  MonotonicClock,
  NotificationController,
  NotificationPlatform,
  NotificationStateWriter,
} from './notification-ports';
import type {
  NotificationContext,
  NotificationObservation,
  NotificationStatus,
} from '../domain/notification-models';
import {
  INITIAL_NOTIFICATION_STATE,
  NOTIFICATION_PERMISSION,
  NOTIFICATION_STATUS,
  NOTIFICATION_RESULT,
  NOTIFICATION_LIMIT,
} from '../domain/notification-models';

export function createNotificationController(
  platform: NotificationPlatform,
  store: NotificationStateWriter,
  clock: MonotonicClock,
  rootLease: string,
): NotificationController {
  let context: NotificationContext | null = null;
  let observation: NotificationObservation | undefined;
  let epoch = 0;
  let intentGeneration = -1;
  let disposed = false;
  let foreground = true;
  let active: Promise<void> | undefined;
  let attemptSequence = 0;
  let proofRevision: number | undefined;
  let cancelExpiry: (() => void) | undefined;
  let cancelCooldown: (() => void) | undefined;

  const clearProof = (): void => {
    proofRevision = undefined;
    cancelExpiry?.();
    cancelExpiry = undefined;

    if (store.getState().status === NOTIFICATION_STATUS.READY) {
      store.replace({...store.getState(), status: NOTIFICATION_STATUS.PENDING});
    }
  };

  const eligible = (value: NotificationObservation | undefined): boolean =>
    value !== undefined &&
    value.permission === NOTIFICATION_PERMISSION.ALLOWED &&
    value.enabled &&
    value.registrationPresent &&
    value.matchesCurrentAccount;

  platform.acquire(rootLease);

  const isCurrent = (captured: NotificationContext, capturedEpoch: number): boolean =>
    !disposed && foreground && context === captured && epoch === capturedEpoch;

  const accept = (next: NotificationObservation): void => {
    if (
      !context ||
      !foreground ||
      disposed ||
      next.rootLease !== rootLease ||
      next.generation !== context.generation ||
      (observation && next.revision < observation.revision)
    )
      return;

    if (proofRevision !== next.revision || !eligible(next)) clearProof();

    observation = next;

    let status: NotificationStatus = NOTIFICATION_STATUS.PENDING;

    if (next.permission === NOTIFICATION_PERMISSION.UNDETERMINED)
      status = NOTIFICATION_STATUS.PERMISSION_NEEDED;
    else if (next.permission === NOTIFICATION_PERMISSION.UNAVAILABLE)
      status = NOTIFICATION_STATUS.UNAVAILABLE;
    else if (next.permission !== NOTIFICATION_PERMISSION.ALLOWED || !next.enabled)
      status = NOTIFICATION_STATUS.DISABLED;

    if (proofRevision === next.revision && eligible(next)) status = NOTIFICATION_STATUS.READY;

    store.replace({
      ...store.getState(),
      status,
      permission: next.permission,
      canRequest: next.canRequest,
    });
  };

  const removeObserver = platform.observe(accept);

  const verify = async (captured: NotificationContext, capturedEpoch: number): Promise<void> => {
    if (!eligible(observation) || !observation) return;

    const revision = observation.revision;
    const attemptId = String(++attemptSequence);
    const attemptStart = clock.now();
    const result = await platform.checkReadiness(captured, revision, attemptId);

    if (
      !isCurrent(captured, capturedEpoch) ||
      observation?.revision !== revision ||
      !eligible(observation) ||
      result.attemptId !== attemptId ||
      result.rootLease !== rootLease ||
      result.generation !== captured.generation ||
      result.revision !== revision
    )
      return;

    if (result.status === NOTIFICATION_RESULT.READY) {
      if (
        !Number.isInteger(result.remainingValidityMs) ||
        result.remainingValidityMs <= NOTIFICATION_LIMIT.ZERO ||
        result.remainingValidityMs > NOTIFICATION_LIMIT.MAX_PROOF_MS
      )
        return;

      const now = clock.now();
      const remaining =
        Math.min(attemptStart + NOTIFICATION_LIMIT.MAX_PROOF_MS, now + result.remainingValidityMs) -
        now;

      if (remaining <= NOTIFICATION_LIMIT.ZERO) return;

      clearProof();
      proofRevision = revision;
      store.replace({...store.getState(), status: NOTIFICATION_STATUS.READY});
      cancelExpiry = clock.schedule(() => {
        if (isCurrent(captured, capturedEpoch)) clearProof();
      }, remaining);

      return;
    }

    clearProof();
    store.replace({
      ...store.getState(),
      status:
        result.status === NOTIFICATION_RESULT.PENDING ||
        result.status === NOTIFICATION_RESULT.RATE_LIMITED
          ? NOTIFICATION_STATUS.PENDING
          : NOTIFICATION_STATUS.UNAVAILABLE,
    });

    if (result.retryAfterSeconds !== undefined && Number.isFinite(result.retryAfterSeconds)) {
      const seconds = Math.min(
        NOTIFICATION_LIMIT.MAX_RETRY_SECONDS,
        Math.max(NOTIFICATION_LIMIT.MIN_RETRY_SECONDS, Math.ceil(result.retryAfterSeconds)),
      );

      cancelCooldown?.();
      store.replace({...store.getState(), retryBlocked: true});
      cancelCooldown = clock.schedule(() => {
        if (!disposed && context === captured)
          store.replace({...store.getState(), retryBlocked: false});
      }, seconds * NOTIFICATION_LIMIT.MS_PER_SECOND);
    }
  };

  const run = (enable: boolean): Promise<void> => {
    if (active) return active;

    if (!context || disposed || !foreground || store.getState().retryBlocked)
      return Promise.resolve();

    const captured = context;
    const capturedEpoch = epoch;
    let attemptedRevision = observation?.revision;

    store.replace({...store.getState(), busy: true});

    const operation = (async (): Promise<void> => {
      try {
        const next = await (enable
          ? platform.enable(captured)
          : platform.reconcile(captured, rootLease, captured.generation));

        if (isCurrent(captured, capturedEpoch)) {
          accept(next);
          attemptedRevision = observation?.revision;
          await verify(captured, capturedEpoch);
        }
      } catch {
        if (isCurrent(captured, capturedEpoch) && observation?.revision === attemptedRevision) {
          clearProof();
          store.replace({...store.getState(), status: NOTIFICATION_STATUS.UNAVAILABLE});
        }
      } finally {
        if (isCurrent(captured, capturedEpoch)) {
          active = undefined;
          store.replace({...store.getState(), busy: false});
        }
      }
    })();

    active = operation;

    return operation;
  };

  return {
    start: (next, generation = next?.generation ?? intentGeneration + 1) => {
      if (disposed || generation <= intentGeneration) return;

      intentGeneration = generation;

      if (
        context &&
        next &&
        context.generation === next.generation &&
        context.sessionId === next.sessionId &&
        context.accountId === next.accountId &&
        next.rootLease === rootLease
      )
        return;

      epoch += 1;
      clearProof();
      cancelCooldown?.();
      cancelCooldown = undefined;
      context = next?.rootLease === rootLease ? next : null;
      observation = undefined;
      active = undefined;
      store.replace(
        context
          ? {...INITIAL_NOTIFICATION_STATE, status: NOTIFICATION_STATUS.PENDING}
          : INITIAL_NOTIFICATION_STATE,
      );

      if (context) void run(false);
      else void platform.reconcile(null, rootLease, intentGeneration).catch(() => undefined);
    },

    refresh: () => run(false),

    enable: () => run(true),

    openSettings: async () => {
      if (!context || disposed) return;

      try {
        await platform.openSettings(context);
      } catch {
        /* Settings failures never alter authentication. */
      }
    },

    setForeground: (next) => {
      if (disposed || foreground === next) return;

      clearProof();
      foreground = next;
      epoch += 1;
      active = undefined;

      if (!next) store.replace({...store.getState(), busy: false});
      else if (context) void run(false);
    },

    dispose: () => {
      if (disposed) return;

      clearProof();
      cancelCooldown?.();
      disposed = true;
      epoch += 1;

      try {
        removeObserver();
      } finally {
        platform.release(rootLease);
      }
    },
  };
}
