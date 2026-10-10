import type {NativeAuthCommand} from './native-auth-commands';

import {NATIVE_AUTH_COMMAND} from './native-auth-commands';

import type {AuthenticationGateway, OperationContext} from '../application/authentication-gateway';
import type {
  AuthErrorCode,
  AuthFailure,
  AuthResult,
  SafeAuthError,
  SessionSnapshot,
} from '../domain/auth-models';

import {
  AUTH_ERROR_CODE,
  AUTH_RESULT_KIND,
  CODE_PURPOSE,
  SESSION_STATUS,
} from '../domain/auth-models';

export const MIN_NATIVE_COUNT = 0;

export const EMPTY_IDENTIFIER_LENGTH = 0;

export interface NativeAuthTransport {
  execute(command: NativeAuthCommand, payload: string): Promise<unknown>;
  subscribe(observer: (value: unknown) => void): () => void;
}

interface UnknownRecord {
  readonly [key: string]: unknown;
}

const codes: readonly AuthErrorCode[] = Object.values(AUTH_ERROR_CODE);

function record(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= MIN_NATIVE_COUNT;
}

function safeError(value: unknown): SafeAuthError {
  const code = record(value)
    ? (codes.find((item) => item === value.code) ?? AUTH_ERROR_CODE.UNEXPECTED)
    : AUTH_ERROR_CODE.UNEXPECTED;
  const retryAfterSeconds =
    record(value) && count(value.retryAfterSeconds) ? value.retryAfterSeconds : undefined;

  return {code, messageKey: code, ...(retryAfterSeconds === undefined ? {} : {retryAfterSeconds})};
}

function failure(value: unknown): AuthFailure {
  return {kind: AUTH_RESULT_KIND.ERROR, ...safeError(value)};
}

function decode(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  try {
    const decoded: unknown = JSON.parse(value);

    return decoded;
  } catch {
    return undefined;
  }
}

function normalize(value: unknown): AuthResult {
  const body = decode(value);

  if (!record(body)) return failure(undefined);

  if (body.kind === AUTH_RESULT_KIND.ERROR) return failure(body);

  if (
    body.kind === AUTH_RESULT_KIND.CHALLENGE &&
    typeof body.attemptId === 'string' &&
    body.attemptId.length > EMPTY_IDENTIFIER_LENGTH &&
    (body.codePurpose === CODE_PURPOSE.SIGN_IN || body.codePurpose === CODE_PURPOSE.DEVICE_TRUST)
  ) {
    return {
      kind: AUTH_RESULT_KIND.CHALLENGE,
      attemptId: body.attemptId,
      codePurpose: body.codePurpose,
      ...(count(body.retryAfterSeconds) ? {retryAfterSeconds: body.retryAfterSeconds} : {}),
    };
  }

  if (!count(body.generation) || !count(body.revision)) return failure(undefined);

  const status = body.status;

  if (
    status !== SESSION_STATUS.ACTIVE &&
    status !== SESSION_STATUS.SIGNED_OUT &&
    status !== SESSION_STATUS.UNAVAILABLE &&
    status !== SESSION_STATUS.RESOLVING
  )
    return failure(undefined);

  if (
    status === SESSION_STATUS.ACTIVE &&
    (typeof body.sessionId !== 'string' ||
      !body.sessionId ||
      typeof body.accountId !== 'string' ||
      !body.accountId ||
      !count(body.validatedAt))
  )
    return failure(undefined);

  return {
    status,
    generation: body.generation,
    revision: body.revision,
    ...(status === SESSION_STATUS.ACTIVE &&
    typeof body.sessionId === 'string' &&
    typeof body.accountId === 'string' &&
    count(body.validatedAt)
      ? {sessionId: body.sessionId, accountId: body.accountId, validatedAt: body.validatedAt}
      : {}),
    ...(body.error === undefined ? {} : {error: safeError(body.error)}),
  };
}

function snapshot(result: AuthResult, context: OperationContext): SessionSnapshot {
  if (!('kind' in result) && result.generation === context.generation) return result;

  return {
    status: SESSION_STATUS.UNAVAILABLE,
    generation: context.generation,
    revision: 0,
    error: 'code' in result ? safeError(result) : safeError(undefined),
  };
}

export function createNativeAuthGateway(transport: NativeAuthTransport): AuthenticationGateway {
  const disposers = new Set<() => void>();
  let latestContext: OperationContext | undefined;
  let latestRevision = 0;

  const execute = async (command: NativeAuthCommand, input: object): Promise<AuthResult> => {
    if (
      command !== NATIVE_AUTH_COMMAND.ABANDON &&
      'generation' in input &&
      'operationId' in input &&
      count(input.generation) &&
      typeof input.operationId === 'string'
    ) {
      latestContext = {generation: input.generation, operationId: input.operationId};
      latestRevision = 0;
    }

    try {
      const result = normalize(await transport.execute(command, JSON.stringify(input)));

      if (!('kind' in result) && result.generation === latestContext?.generation)
        latestRevision = Math.max(latestRevision, result.revision);

      return result;
    } catch {
      return failure(undefined);
    }
  };

  return {
    resolveSession: async (input) =>
      snapshot(
        await execute(NATIVE_AUTH_COMMAND.RESOLVE_SESSION, {...input, forceFresh: true}),
        input,
      ),

    subscribe: (observer) => {
      const stop = transport.subscribe((value) => {
        const result = normalize(value);

        if (!('kind' in result)) {
          if (result.generation === latestContext?.generation)
            latestRevision = Math.max(latestRevision, result.revision);

          observer(result);
        } else if (latestContext)
          observer({
            status: SESSION_STATUS.UNAVAILABLE,
            generation: latestContext.generation,
            revision: ++latestRevision,
            error: safeError(undefined),
          });
      });

      const unsubscribe = (): void => {
        stop();
        disposers.delete(unsubscribe);
      };

      disposers.add(unsubscribe);

      return unsubscribe;
    },

    password: (input) => execute(NATIVE_AUTH_COMMAND.PASSWORD, input),

    requestCode: (input) => execute(NATIVE_AUTH_COMMAND.REQUEST_CODE, input),

    verifyCode: (input) => execute(NATIVE_AUTH_COMMAND.VERIFY_CODE, input),

    resendCode: (input) => execute(NATIVE_AUTH_COMMAND.RESEND_CODE, input),

    google: (input) => execute(NATIVE_AUTH_COMMAND.GOOGLE, input),

    signOut: async (input) => snapshot(await execute(NATIVE_AUTH_COMMAND.SIGN_OUT, input), input),

    abandon: async (input) => {
      await execute(NATIVE_AUTH_COMMAND.ABANDON, input);
    },

    dispose: () => {
      for (const stop of [...disposers]) stop();
    },
  };
}
