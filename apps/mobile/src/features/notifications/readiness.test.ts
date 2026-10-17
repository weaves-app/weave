import {createNotificationController} from './application/notification-controller';
import type {NotificationObservation, NotificationReadiness} from './domain/notification-models';
import {deferred, FakeClock, fakePlatform, fakeState, TEST_CONTEXT} from './testing/fakes';

const tick = async (): Promise<void> => {
  for (let step = 0; step < MICROTASK_TURNS; step++) await Promise.resolve();
};

const observed: NotificationObservation = {
  ...TEST_CONTEXT,
  revision: 7,
  permission: 'allowed',
  canRequest: false,
  registrationPresent: true,
  enabled: true,
  matchesCurrentAccount: true,
};

function setup() {
  const platform = fakePlatform();
  const clock = new FakeClock();
  const state = fakeState();

  jest.mocked(platform.reconcile).mockResolvedValue(observed);

  const controller = createNotificationController(platform, state, clock, 'root-a');

  return {platform, clock, state, controller};
}

function reply(
  attemptId: string,
  overrides: Partial<NotificationReadiness> = {},
): NotificationReadiness {
  return {
    ...TEST_CONTEXT,
    revision: 7,
    attemptId,
    status: 'ready',
    remainingValidityMs: 60000,
    ...overrides,
  };
}

test('S11 only correlated server proof enables ready and expiration never polls', async () => {
  const {platform, clock, state, controller} = setup();

  jest
    .mocked(platform.checkReadiness)
    .mockImplementation(async (_context, _revision, attemptId) => reply(attemptId));
  controller.start(TEST_CONTEXT);
  await tick();
  expect(state.getState().status).toBe('ready');
  clock.advance(59999);
  expect(state.getState().status).toBe('ready');
  clock.advance(1);
  expect(state.getState().status).toBe('pending');
  expect(platform.checkReadiness).toHaveBeenCalledTimes(1);
  controller.dispose();
});

test('S11 separate native origin cannot extend JS attempt-start cap across a delayed response', async () => {
  const {platform, clock, state, controller} = setup();
  const response = deferred<NotificationReadiness>();

  jest.mocked(platform.checkReadiness).mockReturnValue(response.promise);
  controller.start(TEST_CONTEXT);
  await tick();

  const attempt = jest.mocked(platform.checkReadiness).mock.calls[0]?.[2];

  expect(attempt).toBeDefined();
  clock.advance(45000);
  response.resolve(reply(String(attempt), {remainingValidityMs: 60000}));
  await tick();
  expect(state.getState().status).toBe('ready');
  clock.advance(15000);
  expect(state.getState().status).toBe('pending');
  expect(platform.checkReadiness).toHaveBeenCalledTimes(1);
  controller.dispose();
});

test.each([
  {remainingValidityMs: 0},
  {remainingValidityMs: 60001},
  {remainingValidityMs: 1.5},
  {attemptId: 'unknown'},
  {rootLease: 'other-root'},
  {generation: 99},
  {revision: 99},
])('S11 rejects invalid or wrong-context proof %p', async (override) => {
  const {platform, state, controller} = setup();

  jest
    .mocked(platform.checkReadiness)
    .mockImplementation(async (_context, _revision, attemptId) => reply(attemptId, override));
  controller.start(TEST_CONTEXT);
  await tick();
  expect(platform.checkReadiness).toHaveBeenCalledTimes(1);
  expect(state.getState().status).toBe('pending');
  controller.dispose();
});

test.each([
  {registrationPresent: false},
  {enabled: false},
  {matchesCurrentAccount: false},
  {permission: 'denied' as const},
])('S11 never verifies ineligible local installation %p', async (override) => {
  const {platform, state, controller} = setup();

  jest.mocked(platform.reconcile).mockResolvedValue({...observed, ...override});
  controller.start(TEST_CONTEXT);
  await tick();
  expect(platform.checkReadiness).not.toHaveBeenCalled();
  expect(state.getState().status).not.toBe('ready');
  controller.dispose();
});

test('S11 revocation, rotation, background and root disposal invalidate proof immediately', async () => {
  const {platform, state, controller} = setup();

  jest.mocked(platform.checkReadiness).mockImplementation(async (context, revision, attemptId) => ({
    ...reply(attemptId),
    ...context,
    revision,
  }));
  controller.start(TEST_CONTEXT);
  await tick();
  expect(state.getState().status).toBe('ready');
  platform.emit({...observed, revision: 8});
  expect(state.getState().status).toBe('pending');
  expect(platform.checkReadiness).toHaveBeenCalledTimes(1);
  jest.mocked(platform.reconcile).mockResolvedValue({...observed, revision: 8});
  await controller.refresh();
  expect(state.getState().status).toBe('ready');
  platform.emit({...observed, revision: 9, permission: 'denied', enabled: false});
  expect(state.getState().status).toBe('disabled');
  jest.mocked(platform.reconcile).mockResolvedValue({...observed, revision: 10});
  await controller.refresh();
  expect(state.getState().status).toBe('ready');
  controller.setForeground(false);
  expect(state.getState().status).toBe('pending');
  controller.dispose();
});

test('S11 late proof after expiry or A→B→A never restores ready', async () => {
  const {platform, clock, state, controller} = setup();
  const old = deferred<NotificationReadiness>();

  jest.mocked(platform.checkReadiness).mockReturnValueOnce(old.promise);
  controller.start(TEST_CONTEXT);
  await tick();

  const attempt = jest.mocked(platform.checkReadiness).mock.calls[0]?.[2];

  expect(attempt).toBeDefined();
  clock.advance(60001);
  old.resolve(reply(String(attempt)));
  await tick();
  expect(state.getState().status).toBe('pending');

  const late = deferred<NotificationReadiness>();

  jest.mocked(platform.checkReadiness).mockReturnValueOnce(late.promise);

  const pending = controller.refresh();

  await tick();

  const staleAttempt = jest.mocked(platform.checkReadiness).mock.calls[1]?.[2];

  controller.start({
    ...TEST_CONTEXT,
    generation: 2,
    accountId: 'account-b',
    sessionId: 'session-b',
  });
  controller.start({...TEST_CONTEXT, generation: 3});
  late.resolve(reply(String(staleAttempt)));
  await pending;
  expect(state.getState().status).not.toBe('ready');
  controller.dispose();
});

test('S11 same-revision duplicate observations retain but never renew a proof', async () => {
  const {platform, clock, state, controller} = setup();

  jest
    .mocked(platform.checkReadiness)
    .mockImplementation(async (_context, _revision, attemptId) => reply(attemptId));
  controller.start(TEST_CONTEXT);
  await tick();
  clock.advance(45000);
  platform.emit(observed);
  expect(state.getState().status).toBe('ready');
  clock.advance(15000);
  expect(state.getState().status).toBe('pending');
  controller.dispose();
});

test('S11 retry guidance blocks rapid attempts without a scheduled retry', async () => {
  const {platform, clock, state, controller} = setup();

  jest
    .mocked(platform.checkReadiness)
    .mockImplementation(async (_context, _revision, attemptId) =>
      reply(attemptId, {status: 'rate-limited', remainingValidityMs: 0, retryAfterSeconds: 5}),
    );
  controller.start(TEST_CONTEXT);
  await tick();
  expect(state.getState().retryBlocked).toBe(true);
  await controller.refresh();
  expect(platform.checkReadiness).toHaveBeenCalledTimes(1);
  clock.advance(5000);
  expect(state.getState().retryBlocked).toBe(false);
  expect(platform.checkReadiness).toHaveBeenCalledTimes(1);
  await controller.refresh();
  expect(platform.checkReadiness).toHaveBeenCalledTimes(2);
  controller.dispose();
});

export const MICROTASK_TURNS = 8;

test('S11 a failed refresh invalidates its previous proof even after duplicate observations', async () => {
  const {platform, state, controller} = setup();

  jest
    .mocked(platform.checkReadiness)
    .mockImplementation(async (_context, _revision, attemptId) => reply(attemptId));
  controller.start(TEST_CONTEXT);
  await tick();
  expect(state.getState().status).toBe('ready');
  jest.mocked(platform.checkReadiness).mockRejectedValueOnce(new Error('private transport error'));
  await controller.refresh();
  expect(state.getState().status).toBe('unavailable');
  platform.emit(observed);
  expect(state.getState().status).toBe('pending');
  controller.dispose();
});

test('S02/S11 an obsolete attempt failure cannot replace a newer denied permission state', async () => {
  const {platform, state, controller} = setup();
  const pending = deferred<NotificationReadiness>();

  jest.mocked(platform.checkReadiness).mockReturnValue(pending.promise);
  controller.start(TEST_CONTEXT);
  await tick();
  platform.emit({...observed, revision: 8, permission: 'denied', enabled: false});
  expect(state.getState().status).toBe('disabled');
  pending.reject(new Error('stale native result'));
  await tick();
  expect(state.getState()).toMatchObject({status: 'disabled', permission: 'denied', busy: false});
  controller.dispose();
});

test('S09 each proof attempt has a monotonic canonical sequence independent of root identity', async () => {
  const {platform, controller} = setup();

  controller.start(TEST_CONTEXT);
  await tick();
  await controller.refresh();
  expect(jest.mocked(platform.checkReadiness).mock.calls.map((call) => call[2])).toEqual([
    '1',
    '2',
  ]);
  controller.dispose();
});
