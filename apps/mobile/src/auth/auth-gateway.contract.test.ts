import {createNativeAuthGateway} from './infrastructure/native-auth-gateway';
import type {NativeAuthTransport} from './infrastructure/native-auth-gateway';

import {SESSION_STATUS} from './domain/auth-models';

const context = {generation: 1, operationId: 'test-1'};

const active = {
  status: SESSION_STATUS.ACTIVE,
  generation: 1,
  revision: 1,
  sessionId: 'session',
  accountId: 'account',
  validatedAt: 1000,
};

function transport(value: unknown): NativeAuthTransport {
  return {
    execute: async () => JSON.stringify(value),

    subscribe: () => () => undefined,
  };
}

test('S05 validates a fresh native session and removes unrecognized credential fields', async () => {
  const gateway = createNativeAuthGateway(
    transport({...active, token: 'seeded-secret', email: 'private@example.test'}),
  );

  expect(await gateway.resolveSession(context)).toEqual(active);
});

test.each([
  null,
  [],
  {status: SESSION_STATUS.ACTIVE},
  {...active, validatedAt: undefined},
  {...active, generation: -1},
  {...active, status: 'unknown'},
  {...active, accountId: 1},
])('S04 malformed native result fails closed: %p', async (value) => {
  const result = await createNativeAuthGateway(transport(value)).resolveSession(context);

  expect(result.status).toBe('unavailable');
  expect(result.error?.code).toBe('unexpected');
});

test('FR-012 native rejection never exposes provider message or stack', async () => {
  const gateway = createNativeAuthGateway({
    execute: async () => {
      throw new Error('seeded-secret');
    },

    subscribe: () => () => undefined,
  });
  const result = await gateway.resolveSession(context);

  expect(result.error?.code).toBe('unexpected');
  expect(JSON.stringify(result)).not.toContain('seeded-secret');
});

test('FR-012 secure-storage rejection has safe feedback', async () => {
  const result = await createNativeAuthGateway(
    transport({kind: 'error', code: 'storage', message: 'seeded-secret'}),
  ).resolveSession(context);

  expect(result.error?.code).toBe('storage');
  expect(JSON.stringify(result)).not.toContain('seeded-secret');
});

test('S19 retains the opaque device-trust challenge without provider objects', async () => {
  const result = await createNativeAuthGateway(
    transport({
      kind: 'challenge',
      attemptId: 'opaque',
      codePurpose: 'deviceTrust',
      token: 'secret',
    }),
  ).password({...context, email: 'a@example.test', password: 'password'});

  expect(result).toEqual({kind: 'challenge', attemptId: 'opaque', codePurpose: 'deviceTrust'});
});

test('S07 subscription validates native events and disposes listener', () => {
  let observer: (value: unknown) => void = () => undefined;

  let disposed = false;
  const gateway = createNativeAuthGateway({
    execute: async () => '',

    subscribe: (listener) => {
      observer = listener;

      return () => {
        disposed = true;
      };
    },
  });
  const received: unknown[] = [];
  const unsubscribe = gateway.subscribe((value) => received.push(value));

  observer(JSON.stringify(active));
  expect(received).toEqual([active]);
  unsubscribe();
  expect(disposed).toBe(true);
});

test('S04 mismatched response generation fails closed instead of leaving resolution stuck', async () => {
  const gateway = createNativeAuthGateway(transport({...active, generation: 0}));

  expect(await gateway.resolveSession(context)).toMatchObject({
    status: SESSION_STATUS.UNAVAILABLE,
    generation: 1,
    error: {code: 'unexpected'},
  });
});

test('S07 malformed event revokes protected access with a safe current-generation snapshot', async () => {
  let observer: (value: unknown) => void = () => undefined;

  const gateway = createNativeAuthGateway({
    execute: async () => JSON.stringify(active),

    subscribe: (listener) => {
      observer = listener;

      return () => undefined;
    },
  });

  await gateway.resolveSession(context);

  const received: unknown[] = [];

  gateway.subscribe((value) => received.push(value));
  observer('{invalid-event');
  expect(received[0]).toMatchObject({
    status: SESSION_STATUS.UNAVAILABLE,
    generation: 1,
    error: {code: 'unexpected'},
  });
});
