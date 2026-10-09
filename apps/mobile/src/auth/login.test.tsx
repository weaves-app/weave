import {Dimensions, ScrollView, StyleSheet} from 'react-native';
import type {StyleProp, ViewStyle} from 'react-native';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react-native';

import {AuthProvider} from './presentation/auth-context';
import {LoginScreen} from './presentation/login-screen';
import {createAuthController} from './application/auth-controller';
import {active, deferred, TestClock, TestGateway} from './testing/fakes';
import type {AuthResult} from './domain/auth-models';

function setup(gateway = new TestGateway()) {
  const controller = createAuthController(gateway, new TestClock());

  render(
    <AuthProvider createController={() => controller}>
      <LoginScreen />
    </AuthProvider>,
  );

  return {controller, gateway};
}

test('S02/S03 offers exactly three methods and accessible password validation', async () => {
  setup();
  await waitFor(() => expect(screen.getByLabelText('Email')).toBeTruthy());
  expect(screen.getByRole('button', {name: 'Email and password'})).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Email code'})).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Continue with Google'})).toBeTruthy();
  fireEvent.press(screen.getByRole('button', {name: 'Log in'}));
  expect(screen.getByRole('alert')).toHaveTextContent(/Enter a valid email/);
});

test('S08 password stays untrimmed in request, fields clear and pending actions disable', async () => {
  const gateway = new TestGateway();
  const result = deferred<AuthResult>();

  gateway.loginResult = () => result.promise;
  setup(gateway);
  await waitFor(() => expect(gateway.requests).toHaveLength(1));
  fireEvent.changeText(screen.getByLabelText('Email'), 'person@example.com');
  fireEvent.changeText(screen.getByLabelText('Password'), ' password ');
  fireEvent.press(screen.getByRole('button', {name: 'Log in'}));
  expect(screen.getByLabelText('Password')).toHaveDisplayValue('');
  expect(screen.getByRole('button', {name: 'Log in'})).toBeDisabled();
  expect(gateway.requests[1]?.input).toMatchObject({password: ' password '});

  const context = gateway.requests[1]?.input;

  if (!context) throw new Error('missing request');

  await act(async () => result.resolve(active(context)));
});

test.each(['signIn', 'deviceTrust'] as const)(
  'S16/S19 supports %s verification and method return',
  async (codePurpose) => {
    const gateway = new TestGateway();

    gateway.loginResult = async () => ({kind: 'challenge', attemptId: 'attempt', codePurpose});
    setup(gateway);
    await waitFor(() => expect(gateway.requests).toHaveLength(1));
    fireEvent.changeText(screen.getByLabelText('Email'), 'person@example.com');

    if (codePurpose === 'signIn') fireEvent.press(screen.getByRole('button', {name: 'Email code'}));
    else fireEvent.changeText(screen.getByLabelText('Password'), 'password');

    fireEvent.press(
      screen.getByRole('button', {name: codePurpose === 'signIn' ? 'Send code' : 'Log in'}),
    );
    await waitFor(() => expect(screen.getByLabelText('Verification code')).toBeTruthy());
    expect(
      screen.getByText(codePurpose === 'deviceTrust' ? 'Verify this device' : 'Check your email'),
    ).toBeTruthy();
    fireEvent.press(screen.getByRole('button', {name: 'Resend code'}));
    await waitFor(() => expect(gateway.requests.at(-1)?.method).toBe('resendCode'));
    fireEvent.changeText(screen.getByLabelText('Verification code'), '123456');
    fireEvent.press(screen.getByRole('button', {name: 'Verify code'}));
    await waitFor(() => expect(gateway.requests.at(-1)?.method).toBe('verifyCode'));
    fireEvent.press(screen.getByRole('button', {name: 'Choose another method'}));
    expect(screen.queryByLabelText('Verification code')).toBeNull();
  },
);

test.each([
  ['existingAccountRequired', 'An existing account is required'],
  ['verificationRequired', 'requires verification that this app does not support'],
  ['cancelled', 'Sign-in was cancelled'],
] as const)(
  'S17/S18/S20 displays safe %s feedback and usable method controls',
  async (code, message) => {
    const gateway = new TestGateway();

    gateway.loginResult = async () => ({kind: 'error', code, messageKey: code});
    setup(gateway);
    await waitFor(() => expect(gateway.requests).toHaveLength(1));
    fireEvent.press(screen.getByRole('button', {name: 'Continue with Google'}));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(new RegExp(message)));
    expect(screen.getByRole('button', {name: 'Email and password'})).not.toBeDisabled();
  },
);

test('S17 cancelled Google returns a working visible password form', async () => {
  const gateway = new TestGateway();

  gateway.loginResult = async () => ({kind: 'error', code: 'cancelled', messageKey: 'cancelled'});
  setup(gateway);
  await waitFor(() => expect(gateway.requests).toHaveLength(1));
  fireEvent.press(screen.getByRole('button', {name: 'Continue with Google'}));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Sign-in was cancelled/));
  fireEvent.changeText(screen.getByLabelText('Email'), 'person@example.com');
  fireEvent.changeText(screen.getByLabelText('Password'), 'password');
  fireEvent.press(screen.getByRole('button', {name: 'Log in'}));
  await waitFor(() => expect(gateway.requests.at(-1)?.method).toBe('password'));
});

test('S15 the complete login form applies safe-area edges around its keyboard-aware scroll layout', async () => {
  setup();
  await waitFor(() => expect(screen.getByLabelText('Email')).toBeTruthy());
  expect(screen.getByTestId('login-safe-area')).toHaveProp('edges', {
    top: 'additive',
    bottom: 'additive',
    left: 'additive',
    right: 'additive',
  });
});

test('S15 method selection communicates the selected form to assistive technology', async () => {
  setup();
  await waitFor(() => expect(screen.getByLabelText('Email')).toBeTruthy());
  expect(screen.getByRole('button', {name: 'Email and password'})).toHaveProp(
    'accessibilityState',
    expect.objectContaining({selected: true}),
  );
  fireEvent.press(screen.getByRole('button', {name: 'Email code'}));
  expect(screen.getByRole('button', {name: 'Email code'})).toHaveProp(
    'accessibilityState',
    expect.objectContaining({selected: true}),
  );
  expect(screen.getByRole('button', {name: 'Email and password'})).toHaveProp(
    'accessibilityState',
    expect.objectContaining({selected: false}),
  );
  expect(screen.queryByLabelText('Password')).toBeNull();
});

test('S15/S16 formatted code paste fills one editable verification value', async () => {
  const gateway = new TestGateway();

  gateway.loginResult = async () => ({
    kind: 'challenge',
    attemptId: 'attempt',
    codePurpose: 'signIn',
  });
  setup(gateway);
  await waitFor(() => expect(screen.getByLabelText('Email')).toBeTruthy());
  fireEvent.press(screen.getByRole('button', {name: 'Email code'}));
  fireEvent.changeText(screen.getByLabelText('Email'), 'person@example.com');
  fireEvent.press(screen.getByRole('button', {name: 'Send code'}));
  await waitFor(() => expect(screen.getByLabelText('Verification code')).toBeTruthy());
  fireEvent.changeText(screen.getByLabelText('Verification code'), '123');
  expect(screen.getByLabelText('Verification code')).toHaveDisplayValue('123');
  expect(screen.getByRole('button', {name: 'Verify code'})).not.toBeDisabled();
  fireEvent.changeText(screen.getByLabelText('Verification code'), '12 34-56');
  await waitFor(() => expect(gateway.requests.at(-1)?.method).toBe('verifyCode'));
  expect(gateway.requests.at(-1)?.input).toMatchObject({code: '123456'});
  expect(screen.getByLabelText('Verification code')).toHaveDisplayValue('');
});

test('S15/S19 verification requests the native one-time-code autofill keyboard', async () => {
  const gateway = new TestGateway();

  gateway.loginResult = async () => ({
    kind: 'challenge',
    attemptId: 'attempt',
    codePurpose: 'deviceTrust',
  });
  setup(gateway);
  await waitFor(() => expect(screen.getByLabelText('Email')).toBeTruthy());
  fireEvent.changeText(screen.getByLabelText('Email'), 'person@example.com');
  fireEvent.changeText(screen.getByLabelText('Password'), 'password');
  fireEvent.press(screen.getByRole('button', {name: 'Log in'}));
  await waitFor(() => expect(screen.getByLabelText('Verification code')).toBeTruthy());
  expect(screen.getByLabelText('Verification code')).toHaveProp('autoComplete', 'one-time-code');
  expect(screen.getByLabelText('Verification code')).toHaveProp('keyboardType', 'number-pad');
  expect(screen.getByLabelText('Verification code')).toHaveProp('autoFocus', true);
});

test.each(['signIn', 'deviceTrust'] as const)(
  'S16/S19 automatically verifies the sixth digit for %s and permits correction after rejection',
  async (codePurpose) => {
    const gateway = new TestGateway();

    gateway.loginResult = async () => ({kind: 'challenge', attemptId: 'auto-attempt', codePurpose});
    setup(gateway);
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText('Email'), 'person@example.com');

    if (codePurpose === 'signIn') fireEvent.press(screen.getByRole('button', {name: 'Email code'}));
    else fireEvent.changeText(screen.getByLabelText('Password'), 'password');

    fireEvent.press(
      screen.getByRole('button', {name: codePurpose === 'signIn' ? 'Send code' : 'Log in'}),
    );
    await waitFor(() => expect(screen.getByLabelText('Verification code')).toBeTruthy());

    const result = deferred<AuthResult>();

    gateway.loginResult = () => result.promise;
    fireEvent.changeText(screen.getByLabelText('Verification code'), '12345');
    expect(gateway.requests.filter((request) => request.method === 'verifyCode')).toHaveLength(0);
    fireEvent.changeText(screen.getByLabelText('Verification code'), '12 34-56');
    await waitFor(() =>
      expect(gateway.requests.filter((request) => request.method === 'verifyCode')).toHaveLength(1),
    );
    expect(gateway.requests.at(-1)?.input).toMatchObject({
      attemptId: 'auto-attempt',
      codePurpose,
      code: '123456',
    });
    expect(screen.getByLabelText('Verification code')).toBeDisabled();
    expect(screen.getByText('Verifying code…')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Verification code'), '654321');
    expect(gateway.requests.filter((request) => request.method === 'verifyCode')).toHaveLength(1);
    await act(async () =>
      result.resolve({kind: 'error', code: 'codeInvalid', messageKey: 'codeInvalid'}),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/That code was not accepted/);
    expect(screen.getByLabelText('Verification code')).not.toBeDisabled();

    const retry = deferred<AuthResult>();

    gateway.loginResult = () => retry.promise;
    fireEvent.changeText(screen.getByLabelText('Verification code'), '654321');
    await waitFor(() =>
      expect(gateway.requests.filter((request) => request.method === 'verifyCode')).toHaveLength(2),
    );
    expect(gateway.requests.at(-1)?.input).toMatchObject({code: '654321'});
    await act(async () =>
      retry.resolve({kind: 'error', code: 'codeInvalid', messageKey: 'codeInvalid'}),
    );
  },
);

test('S15 clearing login feedback retains the measured scroll extent on method change', async () => {
  setup();
  await waitFor(() => expect(screen.getByLabelText('Email')).toBeTruthy());
  fireEvent.press(screen.getByRole('button', {name: 'Log in'}));
  expect(screen.getByRole('alert')).toBeTruthy();

  const scroll = screen.UNSAFE_getByType(ScrollView);

  fireEvent(scroll, 'contentSizeChange', 400, 1800);
  fireEvent.press(screen.getByRole('button', {name: 'Email code'}));
  expect(screen.queryByRole('alert')).toBeNull();
  fireEvent(scroll, 'contentSizeChange', 400, 1200);
  expect(
    StyleSheet.flatten(scroll.props.contentContainerStyle as StyleProp<ViewStyle>).minHeight ?? 0,
  ).toBeGreaterThanOrEqual(1800);
});

test.each(['signIn', 'deviceTrust'] as const)(
  'S15/S16/S19 keeps branding and %s Back reachable outside the scrolling form',
  async (codePurpose) => {
    const gateway = new TestGateway();
    const verification = deferred<AuthResult>();

    gateway.loginResult = async () => ({kind: 'challenge', attemptId: 'attempt', codePurpose});
    setup(gateway);
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeTruthy());

    const scroll = () => within(screen.UNSAFE_getByType(ScrollView));

    expect(screen.getByLabelText('Weave')).toBeTruthy();
    expect(scroll().queryByLabelText('Weave')).toBeNull();
    expect(screen.queryByRole('button', {name: 'Choose another method'})).toBeNull();
    fireEvent.changeText(screen.getByLabelText('Email'), 'person@example.com');

    if (codePurpose === 'signIn') fireEvent.press(screen.getByRole('button', {name: 'Email code'}));
    else fireEvent.changeText(screen.getByLabelText('Password'), 'password');

    fireEvent.press(
      screen.getByRole('button', {name: codePurpose === 'signIn' ? 'Send code' : 'Log in'}),
    );
    await waitFor(() => expect(screen.getByLabelText('Verification code')).toBeTruthy());
    expect(scroll().queryByLabelText('Weave')).toBeNull();
    expect(scroll().queryByRole('button', {name: 'Choose another method'})).toBeNull();
    gateway.loginResult = () => verification.promise;
    fireEvent.changeText(screen.getByLabelText('Verification code'), '123456');
    expect(screen.getByRole('button', {name: 'Choose another method'})).toBeDisabled();
    await act(async () =>
      verification.resolve({kind: 'error', code: 'codeInvalid', messageKey: 'codeInvalid'}),
    );
    expect(screen.getByRole('button', {name: 'Choose another method'})).not.toBeDisabled();
    fireEvent.press(screen.getByRole('button', {name: 'Choose another method'}));
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(scroll().queryByLabelText('Weave')).toBeNull();
  },
);

test.each(['signIn', 'deviceTrust'] as const)(
  'S15 uses the same form alignment when Login changes to %s verification',
  async (codePurpose) => {
    const gateway = new TestGateway();

    gateway.loginResult = async () => ({kind: 'challenge', attemptId: 'attempt', codePurpose});
    setup(gateway);
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeTruthy());

    const alignment = () =>
      StyleSheet.flatten(
        screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle as StyleProp<ViewStyle>,
      ).justifyContent;

    const loginAlignment = alignment();

    fireEvent.changeText(screen.getByLabelText('Email'), 'person@example.com');

    if (codePurpose === 'signIn') fireEvent.press(screen.getByRole('button', {name: 'Email code'}));
    else fireEvent.changeText(screen.getByLabelText('Password'), 'password');

    fireEvent.press(
      screen.getByRole('button', {name: codePurpose === 'signIn' ? 'Send code' : 'Log in'}),
    );
    await waitFor(() => expect(screen.getByLabelText('Verification code')).toBeTruthy());
    expect(alignment()).toBe(loginAlignment);
  },
);

test('S15 tablet rotation changes the composition without losing email or partial verification code', async () => {
  const original = Dimensions.get('window');

  const resize = (width: number, height: number) => {
    Dimensions.set({window: {...original, width, height}});
  };

  try {
    resize(1376, 1032);

    const gateway = new TestGateway();

    gateway.loginResult = async () => ({
      kind: 'challenge',
      attemptId: 'attempt',
      codePurpose: 'signIn',
    });
    setup(gateway);
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeTruthy());
    expect(screen.getByText('Everything, woven together.')).toBeTruthy();
    expect(
      within(screen.getByTestId('login-safe-area')).queryByText('Everything, woven together.'),
    ).toBeNull();
    fireEvent.changeText(screen.getByLabelText('Email'), 'person@example.com');
    act(() => resize(1032, 1376));
    expect(screen.queryByText('Everything, woven together.')).toBeNull();
    expect(screen.getByLabelText('Email')).toHaveDisplayValue('person@example.com');
    fireEvent.press(screen.getByRole('button', {name: 'Email code'}));
    fireEvent.press(screen.getByRole('button', {name: 'Send code'}));
    await waitFor(() => expect(screen.getByLabelText('Verification code')).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText('Verification code'), '123');
    act(() => resize(1376, 1032));
    expect(screen.getByText('Everything, woven together.')).toBeTruthy();
    expect(screen.getByLabelText('Verification code')).toHaveDisplayValue('123');
    act(() => resize(874, 402));
    expect(screen.queryByText('Everything, woven together.')).toBeNull();
    expect(screen.getByLabelText('Verification code')).toHaveDisplayValue('123');
    expect(gateway.requests.filter((request) => request.method === 'requestCode')).toHaveLength(1);
  } finally {
    act(() => Dimensions.set({window: original}));
  }
});
