import {createNotificationController} from './application/notification-controller';
import type {NotificationObservation} from './domain/notification-models';
import {deferred, FakeClock, fakePlatform, fakeState, TEST_CONTEXT} from './testing/fakes';

const tick = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

function setup() {
  const platform = fakePlatform();
  const state = fakeState();
  const controller = createNotificationController(platform, state, new FakeClock(), 'root-a');

  return {platform, state, controller};
}

const allowed: NotificationObservation = {
  ...TEST_CONTEXT,
  revision: 2,
  permission: 'allowed',
  canRequest: false,
  registrationPresent: true,
  enabled: true,
  matchesCurrentAccount: true,
};

describe('S01–S02 explicit notification permission', () => {
  test('launch, sign-in, foreground and Retry never request permission', async () => {
    const {platform, state, controller} = setup();

    controller.start(null);
    expect(state.getState().status).toBe('hidden');
    controller.start(TEST_CONTEXT);
    await tick();
    expect(state.getState().status).toBe('permission-needed');
    await controller.refresh();
    controller.setForeground(false);
    controller.setForeground(true);
    await tick();
    expect(platform.enable).not.toHaveBeenCalled();
    controller.dispose();
  });

  test('Enable double-tap requests once, clears busy, and allowed registration is only pending', async () => {
    const {platform, state, controller} = setup();
    const permission = deferred<NotificationObservation>();

    jest.mocked(platform.enable).mockReturnValue(permission.promise);
    controller.start(TEST_CONTEXT);
    await tick();

    const first = controller.enable();
    const second = controller.enable();

    expect(platform.enable).toHaveBeenCalledTimes(1);
    expect(state.getState().busy).toBe(true);
    permission.resolve(allowed);
    await Promise.all([first, second]);
    expect(state.getState()).toMatchObject({status: 'pending', busy: false});
    controller.dispose();
  });

  test.each([
    ['denied', false, 'disabled'],
    ['restricted', false, 'disabled'],
    ['undetermined', true, 'permission-needed'],
    ['unavailable', false, 'unavailable'],
  ] as const)(
    '%s observation preserves the appropriate explicit action',
    async (permission, canRequest, status) => {
      const {platform, state, controller} = setup();

      jest.mocked(platform.reconcile).mockResolvedValue({...allowed, permission, canRequest});
      controller.start(TEST_CONTEXT);
      await tick();
      expect(state.getState()).toMatchObject({status, canRequest, busy: false});
      expect(platform.enable).not.toHaveBeenCalled();
      await controller.openSettings();
      expect(platform.openSettings).toHaveBeenCalledWith(TEST_CONTEXT);
      controller.dispose();
    },
  );

  test('settings return refreshes observations without prompting; duplicate active events coalesce', async () => {
    const {platform, state, controller} = setup();

    controller.start(TEST_CONTEXT);
    await tick();
    jest.mocked(platform.reconcile).mockResolvedValue(allowed);
    controller.setForeground(false);
    controller.setForeground(true);
    controller.setForeground(true);
    await tick();
    expect(platform.reconcile).toHaveBeenCalledTimes(2);
    expect(state.getState().status).toBe('pending');
    expect(platform.enable).not.toHaveBeenCalled();
    controller.dispose();
  });

  test('sign-out clears immediately and a late permission completion cannot show signed-in UI', async () => {
    const {platform, state, controller} = setup();
    const permission = deferred<NotificationObservation>();

    jest.mocked(platform.enable).mockReturnValue(permission.promise);
    controller.start(TEST_CONTEXT);
    await tick();

    const request = controller.enable();

    controller.start(null);
    expect(state.getState().status).toBe('hidden');
    permission.resolve(allowed);
    await request;
    expect(state.getState().status).toBe('hidden');
    expect(platform.reconcile).toHaveBeenLastCalledWith(null, 'root-a', expect.any(Number));
    controller.dispose();
  });

  test('native failures become safe unavailable state and preserve retry', async () => {
    const {platform, state, controller} = setup();

    jest.mocked(platform.reconcile).mockRejectedValue(new Error('private-sdk-detail'));
    controller.start(TEST_CONTEXT);
    await tick();
    expect(state.getState()).toMatchObject({status: 'unavailable', busy: false});
    expect(JSON.stringify(state.getState())).not.toContain('private-sdk-detail');
    jest.mocked(platform.reconcile).mockResolvedValue(allowed);
    await controller.refresh();
    expect(state.getState().status).toBe('pending');
    controller.dispose();
  });
});

test('S04 signed-out native intents carry a newer generation and stale contexts cannot restart setup', async () => {
  const {platform, state, controller} = setup();

  controller.start(TEST_CONTEXT);
  await tick();
  controller.start(null);

  const suspension = jest.mocked(platform.reconcile).mock.calls.at(-1);

  expect(suspension).toEqual([null, 'root-a', 2]);

  const count = jest.mocked(platform.reconcile).mock.calls.length;

  controller.start(TEST_CONTEXT);
  await tick();
  expect(state.getState().status).toBe('hidden');
  expect(platform.reconcile).toHaveBeenCalledTimes(count);
  controller.dispose();
});
