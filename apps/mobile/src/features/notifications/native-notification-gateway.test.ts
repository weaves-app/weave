import type {NotificationObservation} from './domain/notification-models';
import {createNativeNotificationGateway} from './infrastructure/native-notification-gateway';
import {TEST_CONTEXT, deferred} from './testing/fakes';

const observation = {
  version: 1,
  kind: 'observation',
  rootLease: 'root-a',
  generation: 1,
  revision: 2,
  permission: 'allowed',
  canRequest: false,
  registrationPresent: true,
  enabled: true,
  matchesCurrentAccount: true,
};

const readiness = {
  version: 1,
  kind: 'readiness',
  rootLease: 'root-a',
  generation: 1,
  revision: 2,
  attemptId: '1',
  status: 'ready',
  remainingValidityMs: 40000,
};

function setup() {
  let listener: (payload: string) => void = () => undefined;

  const remove = jest.fn();
  const execute = jest.fn(async () => JSON.stringify(observation));
  const gateway = createNativeNotificationGateway({
    execute,

    subscribe: (next) => {
      listener = next;

      return remove;
    },
  });

  gateway.acquire('root-a');

  return {
    gateway,
    execute,
    remove,

    emit: (value: unknown) => listener(JSON.stringify(value)),
  };
}

it('binds versioned intents and returns only public observation fields', async () => {
  const {gateway, execute} = setup();
  const result = await gateway.reconcile(TEST_CONTEXT, 'root-a', 1);
  const publicFields = {
    rootLease: 'root-a',
    generation: 1,
    revision: 2,
    permission: 'allowed',
    canRequest: false,
    registrationPresent: true,
    enabled: true,
    matchesCurrentAccount: true,
  };

  expect(result).toEqual(publicFields);
  expect(execute).toHaveBeenNthCalledWith(
    1,
    'acquire',
    JSON.stringify({version: 1, rootLease: 'root-a', generation: 0}),
  );
  expect(execute).toHaveBeenLastCalledWith(
    'reconcile',
    JSON.stringify({version: 1, ...TEST_CONTEXT}),
  );
});

it.each([
  {token: 'secret-token'},
  {externalId: 'private-account'},
  {kind: 'click', url: 'https://evil.test'},
  {revision: -1},
  {generation: 0},
  {permission: 'provisional'},
  {enabled: 'true'},
  {rootLease: 'old-root'},
  {version: 2},
])('rejects malformed or stale observations %j', async (patch) => {
  const {gateway, execute} = setup();

  execute.mockResolvedValue(JSON.stringify({...observation, ...patch}));
  await expect(gateway.reconcile(TEST_CONTEXT, 'root-a', 1)).rejects.toThrow(
    'Notification unavailable',
  );
});

it('filters events and stops the native subscription on removal', async () => {
  const {gateway, emit, remove} = setup();

  await gateway.reconcile(TEST_CONTEXT, 'root-a', 1);

  const listener = jest.fn<void, [NotificationObservation]>();
  const unsubscribe = gateway.observe(listener);

  emit({...observation, token: 'secret'});
  emit({...observation, kind: 'click', url: 'https://evil.test'});
  emit({...observation, generation: 0});
  emit({...observation, revision: 1});
  emit({...observation, revision: 3});
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener.mock.calls[0]?.[0]).toMatchObject({revision: 3});
  unsubscribe();
  expect(remove).toHaveBeenCalledTimes(1);
});

it('accepts only correlated bounded readiness and no native clock origin', async () => {
  const {gateway, execute} = setup();

  await gateway.reconcile(TEST_CONTEXT, 'root-a', 1);
  execute.mockResolvedValue(JSON.stringify(readiness));
  await expect(gateway.checkReadiness(TEST_CONTEXT, 2, '1')).resolves.toMatchObject({
    remainingValidityMs: 40000,
  });
  expect(execute).toHaveBeenLastCalledWith(
    'refresh',
    JSON.stringify({version: 1, ...TEST_CONTEXT, revision: 2, attemptId: '1'}),
  );
});

it.each([
  {attemptId: 'old'},
  {revision: 1},
  {remainingValidityMs: 60001},
  {remainingValidityMs: 1.5},
  {remainingValidityMs: 0},
  {status: 'pending'},
  {retryAfterSeconds: 0},
  {retryAfterSeconds: 61},
  {deadline: 999999},
  {token: 'private'},
])('rejects invalid readiness %j', async (patch) => {
  const {gateway, execute} = setup();

  await gateway.reconcile(TEST_CONTEXT, 'root-a', 1);
  execute.mockResolvedValue(JSON.stringify({...readiness, ...patch}));
  await expect(gateway.checkReadiness(TEST_CONTEXT, 2, '1')).rejects.toThrow(
    'Notification unavailable',
  );
});

it('drops delayed results after signed-out intent and ignores stale release', async () => {
  const {gateway, execute} = setup();

  await gateway.reconcile(TEST_CONTEXT, 'root-a', 1);

  const pending = deferred<string>();

  execute.mockImplementationOnce(() => pending.promise);

  const proof = gateway.checkReadiness(TEST_CONTEXT, 2, '1');

  await Promise.resolve();
  execute.mockResolvedValue(JSON.stringify({...observation, generation: 2}));
  await gateway.reconcile(null, 'root-a', 2);
  pending.resolve(JSON.stringify(readiness));
  await expect(proof).rejects.toThrow('Notification unavailable');
  gateway.release('old-root');
  expect(execute).not.toHaveBeenCalledWith('release', expect.anything());
});

it('sanitizes native failures and never forwards their private details', async () => {
  const {gateway, execute} = setup();

  execute.mockRejectedValue(new Error('secret-token private-payload'));
  await expect(gateway.reconcile(TEST_CONTEXT, 'root-a', 1)).rejects.toThrow(
    /^Notification unavailable$/,
  );
});

it.each(['01', '0', '-1', '1e0', '9007199254740992'])(
  'rejects noncanonical attempt sequence %s before native dispatch',
  async (attemptId) => {
    const {gateway, execute} = setup();

    await gateway.reconcile(TEST_CONTEXT, 'root-a', 1);
    execute.mockResolvedValue(JSON.stringify({...readiness, attemptId}));
    await expect(gateway.checkReadiness(TEST_CONTEXT, 2, attemptId)).rejects.toThrow(
      'Notification unavailable',
    );
    expect(execute).not.toHaveBeenCalledWith('refresh', expect.anything());
  },
);

it('never dispatches a reused attempt even after generation changes or same-lease acquisition', async () => {
  const {gateway, execute} = setup();

  await gateway.reconcile(TEST_CONTEXT, 'root-a', 1);
  execute.mockResolvedValue(JSON.stringify(readiness));
  await gateway.checkReadiness(TEST_CONTEXT, 2, '1');
  gateway.acquire('root-a');

  const next = {...TEST_CONTEXT, generation: 2};

  execute.mockResolvedValue(JSON.stringify({...observation, generation: 2}));
  await gateway.reconcile(next, 'root-a', 2);
  execute.mockResolvedValue(JSON.stringify({...readiness, generation: 2}));
  await expect(gateway.checkReadiness(next, 2, '1')).rejects.toThrow('Notification unavailable');
});
