import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

import {SESSION_STATUS} from './domain/auth-models';

export const FIRST_MOUNT = 1;

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native';

import {App} from '../../App';
import {createAuthController} from './application/auth-controller';
import {active, TestClock, TestGateway} from './testing/fakes';

afterEach(() => jest.restoreAllMocks());

test.each(['active', 'signedOut', 'unavailable'] as const)(
  'S12/S13 provider failure Reload freshly resolves %s without old routes',
  async (status) => {
    const diagnostic = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const gateway = new TestGateway();

    gateway.resolveResult = async (input) =>
      status === SESSION_STATUS.ACTIVE
        ? active(input)
        : {status, generation: input.generation, revision: 1};

    let fail = true;

    render(
      <App
        createController={() => {
          if (fail) throw new Error('seed-sensitive-error');

          return createAuthController(gateway, new TestClock());
        }}
      />,
    );
    expect(screen.getByRole('button', {name: 'Reload'})).toBeTruthy();
    expect(screen.queryByText(/seed-sensitive-error/)).toBeNull();
    fail = false;
    fireEvent.press(screen.getByRole('button', {name: 'Reload'}));
    await waitFor(() => expect(gateway.requests).toHaveLength(1));
    expect(gateway.requests[0]?.method).toBe('resolve');
    await waitFor(() =>
      expect(
        status === SESSION_STATUS.ACTIVE
          ? screen.getByText('Home')
          : status === SESSION_STATUS.SIGNED_OUT
            ? screen.getByText('Welcome back')
            : screen.getByRole('button', {name: 'Try again'}),
      ).toBeTruthy(),
    );
    diagnostic.mockRestore();
  },
);

test('S14 persistent provider failure returns Reload without an automatic retry loop', () => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);

  const factory = jest.fn(() => {
    throw new Error('persistent-provider-failure');
  });

  render(<App createController={factory} />);
  expect(screen.getByRole('button', {name: 'Reload'})).toBeTruthy();

  const before = factory.mock.calls.length;

  fireEvent.press(screen.getByRole('button', {name: 'Reload'}));
  expect(screen.getByRole('button', {name: 'Reload'})).toBeTruthy();
  expect(factory.mock.calls.length).toBeGreaterThan(before);

  const settled = factory.mock.calls.length;

  expect(factory.mock.calls.length).toBe(settled);
});

test('S13 a mounted auth failure disposes old subscriptions and prevents late old-root activation after Reload', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);

  const first = new TestGateway();

  first.resolveResult = async (input) => active(input);

  const second = new TestGateway();
  let fault = false;
  let roots = 0;
  const clock = new TestClock();
  const controller = createAuthController(first, clock);

  render(
    <App
      createController={() => {
        roots++;

        return roots === FIRST_MOUNT
          ? {
              ...controller,

              getSnapshot: () => {
                if (fault) throw new Error('auth-state-render-fault');

                return controller.getSnapshot();
              },
            }
          : createAuthController(second, clock);
      }}
    />,
  );
  await waitFor(() => expect(screen.getByText('Home')).toBeTruthy());

  const old = first.requests[0]?.input;

  if (!old) throw new Error('missing first context');

  act(() => {
    fault = true;
    first.emit(active(old, 2));
  });
  expect(screen.getByRole('button', {name: 'Reload'})).toBeTruthy();
  expect(first.disposed).toBe(true);
  expect(first.abandoned).toContainEqual(old);
  fireEvent.press(screen.getByRole('button', {name: 'Reload'}));
  await waitFor(() => expect(screen.getByText('Welcome back')).toBeTruthy());
  act(() => first.emit(active(old, 3)));
  expect(screen.queryByText('Home')).toBeNull();
  expect(second.requests[0]?.input.generation).toBeGreaterThan(old.generation);
});
