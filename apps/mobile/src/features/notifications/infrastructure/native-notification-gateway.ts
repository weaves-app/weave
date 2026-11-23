import type {NotificationPlatform} from '../application/notification-ports';
import {
  NOTIFICATION_LIMIT,
  NOTIFICATION_PERMISSION,
  NOTIFICATION_RESULT,
} from '../domain/notification-models';
import type {
  NotificationContext,
  NotificationObservation,
  NotificationReadiness,
} from '../domain/notification-models';

export interface NativeNotificationTransport {
  execute(command: string, payload: string): Promise<string>;
  subscribe(listener: (payload: string) => void): () => void;
}

export const WIRE = {
  VERSION: 1,
  ZERO: 0,
  MAX_TEXT: 128,
  MAX_RESPONSE: 4096,
  OBSERVATION: 'observation',
  READINESS: 'readiness',
} as const;

const OBSERVATION_KEYS = [
  'version',
  'kind',
  'rootLease',
  'generation',
  'revision',
  'permission',
  'canRequest',
  'registrationPresent',
  'enabled',
  'matchesCurrentAccount',
] as const;

const READINESS_KEYS = [
  'version',
  'kind',
  'rootLease',
  'generation',
  'revision',
  'attemptId',
  'status',
  'remainingValidityMs',
  'retryAfterSeconds',
] as const;

function unavailable(): Error {
  return new Error('Notification unavailable');
}

function counter(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= WIRE.ZERO;
}

function text(value: unknown): value is string {
  return typeof value === 'string' && value.length > WIRE.ZERO && value.length <= WIRE.MAX_TEXT;
}

function attemptSequence(value: string): number | undefined {
  const sequence = Number(value);

  return /^[1-9][0-9]*$/.test(value) && Number.isSafeInteger(sequence) && String(sequence) === value
    ? sequence
    : undefined;
}

function parse(payload: string): Record<string, unknown> {
  if (payload.length > WIRE.MAX_RESPONSE) throw unavailable();

  const value: unknown = JSON.parse(payload);

  if (!value || typeof value !== 'object' || Array.isArray(value)) throw unavailable();

  return value as Record<string, unknown>;
}

function keys(value: Readonly<Record<string, unknown>>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

export function createNativeNotificationGateway(
  transport: NativeNotificationTransport,
): NotificationPlatform {
  let lease: string | undefined;
  let generation = -1;
  let highestAttempt = 0;
  let identity: NotificationContext | null = null;
  let revision = -1;
  let acquired: Promise<boolean> = Promise.resolve(false);

  const current = (context: NotificationContext): boolean =>
    context.rootLease === lease &&
    context.generation === generation &&
    context.sessionId === identity?.sessionId &&
    context.accountId === identity.accountId;

  const envelope = (value: Readonly<Record<string, unknown>>): boolean =>
    value.version === WIRE.VERSION &&
    value.rootLease === lease &&
    value.generation === generation &&
    counter(value.revision) &&
    value.revision >= revision;

  const observation = (value: Record<string, unknown>): NotificationObservation => {
    if (
      !keys(value, OBSERVATION_KEYS) ||
      value.kind !== WIRE.OBSERVATION ||
      !envelope(value) ||
      !Object.values(NOTIFICATION_PERMISSION).some(
        (permission) => permission === value.permission,
      ) ||
      typeof value.canRequest !== 'boolean' ||
      typeof value.registrationPresent !== 'boolean' ||
      typeof value.enabled !== 'boolean' ||
      typeof value.matchesCurrentAccount !== 'boolean'
    )
      throw unavailable();

    revision = value.revision as number;

    return {
      rootLease: value.rootLease as string,
      generation: value.generation as number,
      revision,
      permission: value.permission as NotificationObservation['permission'],
      canRequest: value.canRequest,
      registrationPresent: value.registrationPresent,
      enabled: value.enabled,
      matchesCurrentAccount: value.matchesCurrentAccount,
    };
  };

  const execute = async (
    command: string,
    payload: Readonly<Record<string, unknown>>,
  ): Promise<Record<string, unknown>> => {
    try {
      if (!(await acquired) || payload.rootLease !== lease || payload.generation !== generation)
        throw unavailable();

      const result = await transport.execute(
        command,
        JSON.stringify({version: WIRE.VERSION, ...payload}),
      );

      if (payload.rootLease !== lease || payload.generation !== generation) throw unavailable();

      return parse(result);
    } catch {
      throw unavailable();
    }
  };

  return {
    acquire: (rootLease) => {
      if (!text(rootLease)) throw unavailable();

      if (rootLease === lease) return;

      lease = rootLease;
      highestAttempt = 0;
      generation = -1;
      revision = -1;
      identity = null;

      // Acquisition errors are consumed here; the first operation reports a sanitized failure.
      try {
        acquired = transport
          .execute(
            'acquire',
            JSON.stringify({version: WIRE.VERSION, rootLease, generation: WIRE.ZERO}),
          )
          .then(
            () => true,
            () => false,
          );
      } catch {
        acquired = Promise.resolve(false);
      }
    },

    release: (rootLease) => {
      if (rootLease !== lease) return;

      lease = undefined;
      identity = null;
      generation = -1;

      try {
        void transport
          .execute(
            'release',
            JSON.stringify({version: WIRE.VERSION, rootLease, generation: WIRE.ZERO}),
          )
          .catch(() => undefined);
      } catch {
        /* Cleanup remains local; auth is independent. */
      }
    },

    observe: (listener) =>
      transport.subscribe((payload) => {
        let result: NotificationObservation;

        try {
          result = observation(parse(payload));
        } catch {
          return;
        }

        listener(result);
      }),

    reconcile: async (context, rootLease, nextGeneration) => {
      if (
        rootLease !== lease ||
        !counter(nextGeneration) ||
        nextGeneration < generation ||
        (context &&
          (context.rootLease !== rootLease ||
            context.generation !== nextGeneration ||
            !text(context.sessionId) ||
            !text(context.accountId))) ||
        (nextGeneration === generation &&
          (context?.sessionId !== identity?.sessionId ||
            context?.accountId !== identity?.accountId))
      )
        throw unavailable();

      if (nextGeneration !== generation) revision = -1;

      generation = nextGeneration;
      identity = context;

      return observation(
        await execute('reconcile', context ? {...context} : {rootLease, generation}),
      );
    },

    enable: async (context) => {
      if (!current(context)) throw unavailable();

      return observation(await execute('enable', {...context}));
    },

    openSettings: async (context) => {
      if (!current(context)) throw unavailable();

      observation(await execute('openSettings', {...context}));
    },

    checkReadiness: async (context, expectedRevision, attemptId) => {
      if (
        !current(context) ||
        !counter(expectedRevision) ||
        expectedRevision !== revision ||
        !text(attemptId)
      )
        throw unavailable();

      const sequence = attemptSequence(attemptId);

      if (sequence === undefined || sequence <= highestAttempt) throw unavailable();

      highestAttempt = sequence;

      const value = await execute('refresh', {...context, revision: expectedRevision, attemptId});
      const remaining = value.remainingValidityMs;
      const retry = value.retryAfterSeconds;

      if (
        !keys(value, READINESS_KEYS) ||
        value.kind !== WIRE.READINESS ||
        !envelope(value) ||
        value.revision !== expectedRevision ||
        value.attemptId !== attemptId ||
        !Object.values(NOTIFICATION_RESULT).some((status) => status === value.status) ||
        !counter(remaining) ||
        remaining > NOTIFICATION_LIMIT.MAX_PROOF_MS ||
        (value.status === NOTIFICATION_RESULT.READY
          ? remaining === WIRE.ZERO
          : remaining !== WIRE.ZERO) ||
        (retry !== undefined &&
          (!counter(retry) ||
            retry < NOTIFICATION_LIMIT.MIN_RETRY_SECONDS ||
            retry > NOTIFICATION_LIMIT.MAX_RETRY_SECONDS))
      )
        throw unavailable();

      return {
        rootLease: context.rootLease,
        generation: context.generation,
        revision: expectedRevision,
        attemptId,
        status: value.status as NotificationReadiness['status'],
        remainingValidityMs: remaining,
        ...(retry === undefined ? {} : {retryAfterSeconds: retry}),
      };
    },
  };
}
