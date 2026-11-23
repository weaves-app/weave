import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

import {AppState} from 'react-native';
import type {AppStateStatus} from 'react-native';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native';

import {App} from '../../../App';
import {createAuthRuntime} from '../../auth/auth-runtime';
import {active, deferred, TestClock, TestGateway} from '../../auth/testing/fakes';
import type {AuthResult} from '../../auth/domain/auth-models';
import {createLocalizationRuntime} from '../localization-runtime';

export const JOURNEY_STAGE = {
  DRAFT: 'draft',
  PENDING: 'pending',
  VERIFICATION: 'verification',
  ACTIVE: 'active',
} as const;

export const PASSWORD_REQUEST = 'password';

async function foregroundJourney(changeLocale: boolean, stage: string) {
  const listeners = new Set<(state: AppStateStatus) => void>();
  const appState = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, listener) => {
      listeners.add(listener);

      return {remove: () => listeners.delete(listener)};
    });
  const gateway = new TestGateway();
  const late = deferred<AuthResult>();

  if (stage === JOURNEY_STAGE.ACTIVE) gateway.resolveResult = async (input) => active(input);

  if (stage === JOURNEY_STAGE.PENDING) gateway.loginResult = () => late.promise;

  if (stage === JOURNEY_STAGE.VERIFICATION)
    gateway.loginResult = async () => ({
      kind: 'challenge',
      attemptId: 'paired-attempt',
      codePurpose: 'signIn',
    });

  let locale = 'en';
  const read = jest.fn(() => locale);
  const authFactory = jest.fn(() => createAuthRuntime(gateway, new TestClock()));
  const localeFactory = jest.fn(() => createLocalizationRuntime({localeSource: {read}}));
  const view = render(<App createRuntime={authFactory} createLocalization={localeFactory} />);

  if (stage === JOURNEY_STAGE.ACTIVE)
    await waitFor(() => expect(screen.getByText('Home')).toBeTruthy());
  else {
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText('Email'), 'person@example.com');

    if (stage === JOURNEY_STAGE.PENDING || stage === JOURNEY_STAGE.VERIFICATION) {
      fireEvent.changeText(screen.getByLabelText('Password'), 'password');
      fireEvent.press(screen.getByRole('button', {name: 'Log in'}));

      if (stage === JOURNEY_STAGE.VERIFICATION)
        await waitFor(() => expect(screen.getByLabelText('Verification code')).toBeTruthy());
    }
  }

  const before = gateway.requests.length;

  act(() => {
    for (const listener of [...listeners]) listener('background');
  });

  if (changeLocale) locale = 'fr-FR';

  act(() => {
    for (const listener of [...listeners]) listener('active');
  });
  await waitFor(() =>
    expect(
      screen.getByText(
        stage === JOURNEY_STAGE.ACTIVE
          ? 'Home'
          : stage === JOURNEY_STAGE.VERIFICATION
            ? 'Check your email'
            : 'Welcome back',
      ),
    ).toBeTruthy(),
  );

  // Existing auth refresh may remount a form; compare its result with the control run.
  const formValue: unknown =
    stage === JOURNEY_STAGE.ACTIVE
      ? undefined
      : screen.getByLabelText(stage === JOURNEY_STAGE.VERIFICATION ? 'Verification code' : 'Email')
          .props.value;
  const result = {
    operations: gateway.requests.length - before,
    authConstructions: authFactory.mock.calls.length,
    localeConstructions: localeFactory.mock.calls.length,
    localeReads: read.mock.calls.length,
    email: formValue,
  };

  if (stage === JOURNEY_STAGE.PENDING) {
    const input = gateway.requests.find((request) => request.method === PASSWORD_REQUEST)?.input;

    if (input) await act(async () => late.resolve(active(input)));

    expect(screen.queryByText('Home')).toBeNull();
  }

  view.unmount();
  expect(listeners.size).toBe(0);
  expect(gateway.disposed).toBe(true);
  appState.mockRestore();

  return result;
}

test.each(['draft', 'pending', 'verification', 'active'])(
  'WEA-28 S07 locale changes add no auth operations or resets beyond matched parent %s foreground behavior',
  async (stage) => {
    const control = await foregroundJourney(false, stage);
    const changed = await foregroundJourney(true, stage);

    expect(changed).toEqual(control);
    expect(changed.authConstructions).toBe(1);
    expect(changed.localeConstructions).toBe(1);
    expect(changed.localeReads).toBe(2);
    expect(changed.operations).toBe(1);
  },
);
