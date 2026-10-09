import type {AuthenticationGateway, OperationContext} from '../application/authentication-gateway';
import type {
  AuthErrorCode,
  AuthFailure,
  AuthResult,
  SafeAuthError,
  SessionSnapshot,
} from '../domain/auth-models';
export interface NativeAuthTransport {
  execute(command: string, payload: string): Promise<unknown>;
  subscribe(observer: (value: unknown) => void): () => void;
}
interface UnknownRecord {
  readonly [key: string]: unknown;
}
const codes: readonly AuthErrorCode[] = [
  'invalidInput',
  'rejectedCredentials',
  'codeInvalid',
  'codeExpired',
  'rateLimited',
  'existingAccountRequired',
  'cancelled',
  'network',
  'timeout',
  'configuration',
  'verificationRequired',
  'storage',
  'unexpected',
];
function record(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
function safeError(value: unknown): SafeAuthError {
  const code = record(value)
    ? (codes.find((item) => item === value.code) ?? 'unexpected')
    : 'unexpected';
  const retryAfterSeconds =
    record(value) && count(value.retryAfterSeconds) ? value.retryAfterSeconds : undefined;
  return {code, messageKey: code, ...(retryAfterSeconds === undefined ? {} : {retryAfterSeconds})};
}
function failure(value: unknown): AuthFailure {
  return {kind: 'error', ...safeError(value)};
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
  if (body.kind === 'error') return failure(body);
  if (
    body.kind === 'challenge' &&
    typeof body.attemptId === 'string' &&
    body.attemptId.length > 0 &&
    (body.codePurpose === 'signIn' || body.codePurpose === 'deviceTrust')
  ) {
    return {
      kind: 'challenge',
      attemptId: body.attemptId,
      codePurpose: body.codePurpose,
      ...(count(body.retryAfterSeconds) ? {retryAfterSeconds: body.retryAfterSeconds} : {}),
    };
  }
  if (!count(body.generation) || !count(body.revision)) return failure(undefined);
  const status = body.status;
  if (
    status !== 'active' &&
    status !== 'signedOut' &&
    status !== 'unavailable' &&
    status !== 'resolving'
  )
    return failure(undefined);
  if (
    status === 'active' &&
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
    ...(status === 'active' &&
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
    status: 'unavailable',
    generation: context.generation,
    revision: 0,
    error: 'code' in result ? safeError(result) : safeError(undefined),
  };
}
export function createNativeAuthGateway(transport: NativeAuthTransport): AuthenticationGateway {
  const disposers = new Set<() => void>();
  let latestContext: OperationContext | undefined;
  let latestRevision = 0;
  const execute = async (command: string, input: object): Promise<AuthResult> => {
    if (
      command !== 'abandon' &&
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
      snapshot(await execute('resolveSession', {...input, forceFresh: true}), input),
    subscribe: (observer) => {
      const stop = transport.subscribe((value) => {
        const result = normalize(value);
        if (!('kind' in result)) {
          if (result.generation === latestContext?.generation)
            latestRevision = Math.max(latestRevision, result.revision);
          observer(result);
        } else if (latestContext)
          observer({
            status: 'unavailable',
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
    password: (input) => execute('password', input),
    requestCode: (input) => execute('requestCode', input),
    verifyCode: (input) => execute('verifyCode', input),
    resendCode: (input) => execute('resendCode', input),
    google: (input) => execute('google', input),
    signOut: async (input) => snapshot(await execute('signOut', input), input),
    abandon: async (input) => {
      await execute('abandon', input);
    },
    dispose: () => {
      for (const stop of [...disposers]) stop();
    },
  };
}
