import {createNativeNotificationGateway} from './infrastructure/native-notification-gateway';
import {createNotificationRuntime} from './notification-runtime';
import {createInitialAuthState} from '../../auth/application/auth-state-store';
import {createZustandAuthStateStore} from '../../auth/infrastructure/zustand-auth-state-store';
import {FakeClock} from './testing/fakes';

it('S10 native errors and payloads never enter notification state or authored logs', async () => {
  const sentinel = 'SENTINEL_PRIVATE_TOKEN_AND_NOTIFICATION_BODY';
  const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  try {
    let emit: (payload: string) => void = () => undefined;

    const platform = createNativeNotificationGateway({
      execute: async () => {
        throw new Error(sentinel);
      },

      subscribe: (listener) => {
        emit = listener;

        return () => undefined;
      },
    });
    const auth = createZustandAuthStateStore({
      ...createInitialAuthState(),
      session: {
        status: 'active',
        generation: 1,
        revision: 1,
        sessionId: 's',
        accountId: 'a',
        validatedAt: 1,
      },
    });
    const runtime = createNotificationRuntime(auth, platform, new FakeClock(), 'privacy-root');
    const states: unknown[] = [];

    runtime.state.subscribe(() => states.push(runtime.state.getState()));
    emit(
      JSON.stringify({
        version: 1,
        kind: 'observation',
        rootLease: 'privacy-root',
        generation: 1,
        revision: 1,
        permission: 'allowed',
        canRequest: false,
        registrationPresent: true,
        enabled: true,
        matchesCurrentAccount: true,
        token: sentinel,
      }),
    );
    await runtime.controller.refresh();
    expect(runtime.state.getState().status).toBe('unavailable');
    expect(JSON.stringify(states)).not.toContain(sentinel);
    expect(JSON.stringify(states)).not.toContain('accountId');
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    runtime.dispose();
  } finally {
    log.mockRestore();
    warn.mockRestore();
    error.mockRestore();
  }
});
