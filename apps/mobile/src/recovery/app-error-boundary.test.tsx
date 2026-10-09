import {createRef, isValidElement, useEffect, useLayoutEffect, useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import {act, fireEvent, render, screen} from '@testing-library/react-native';
import {AppErrorBoundary} from './app-error-boundary';
import {RecoveryScreen} from './recovery-screen';
import type {RecoveryScreenProps} from './recovery-screen';

const seededSecret = 'seeded-credential-must-stay-private';
let consoleErrors: jest.SpyInstance;
let consoleLogs: jest.SpyInstance;
let consoleWarnings: jest.SpyInstance;

beforeEach(() => {
  consoleErrors = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  consoleLogs = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  consoleWarnings = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

interface FaultProps {
  readonly phase: 'render' | 'lifecycle';
}

function isRecoveryScreenProps(value: unknown): value is RecoveryScreenProps {
  return (
    typeof value === 'object' &&
    value !== null &&
    'onReload' in value &&
    typeof value.onReload === 'function'
  );
}

function Fault({phase}: FaultProps): React.JSX.Element {
  useLayoutEffect(() => {
    if (phase === 'lifecycle') throw new Error(seededSecret);
  }, [phase]);
  if (phase === 'render') throw new Error(seededSecret);
  return <Text>Private Home content</Text>;
}

test.each(['render', 'lifecycle'] as const)(
  'S12 replaces the whole failed subtree after a %s failure with accessible recovery',
  (phase) => {
    render(
      <AppErrorBoundary
        renderChildren={() => (
          <View>
            <Text>Private Home content</Text>
            <Fault phase={phase} />
          </View>
        )}
      />,
    );

    expect(screen.getByRole('button', {name: 'Reload'})).toBeTruthy();
    expect(screen.getByRole('header')).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveProp('accessibilityLiveRegion', 'polite');
    expect(screen.queryByText('Private Home content')).toBeNull();
    expect(screen.queryByText(seededSecret)).toBeNull();
  },
);

test('S12 catches a failure in the root factory beneath the boundary', () => {
  render(
    <AppErrorBoundary
      renderChildren={() => {
        throw new Error(seededSecret);
      }}
    />,
  );
  expect(screen.getByRole('button', {name: 'Reload'})).toBeTruthy();
});

test('S12/S15 recovery works without authentication, navigation or an outer safe-area provider', () => {
  let requested = 0;
  render(
    <RecoveryScreen
      onReload={() => {
        requested += 1;
      }}
    />,
  );
  expect(screen.getByRole('button', {name: 'Reload'})).toBeEnabled();
  expect(screen.getByRole('alert')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', {name: 'Reload'}));
  expect(requested).toBe(1);
});

test('S12 keeps seeded error data out of rendered fallback and application diagnostics', () => {
  const view = render(<AppErrorBoundary renderChildren={() => <Fault phase="render" />} />);
  expect(screen.getByRole('button', {name: 'Reload'})).toBeTruthy();
  expect(JSON.stringify(view.toJSON())).not.toContain(seededSecret);
  expect(consoleLogs).not.toHaveBeenCalled();
  expect(consoleWarnings).not.toHaveBeenCalled();
  // React Test Renderer reports caught errors itself; this does not assert privacy of RN diagnostics.
  const applicationErrors = consoleErrors.mock.calls.filter(
    (args: readonly unknown[]) =>
      !args.some((arg) => typeof arg === 'string' && arg.includes('React will try to recreate')),
  );
  expect(applicationErrors).toEqual([]);
});

test('S13 disposes failed state and remounts the complete subtree with a fresh generation', () => {
  let failure = false;
  const mounted: number[] = [];
  const disposed: number[] = [];

  function StatefulRoot({generation}: {readonly generation: number}): React.JSX.Element {
    const [value, setValue] = useState('Fresh state');
    useEffect(() => {
      mounted.push(generation);
      return () => {
        disposed.push(generation);
      };
    }, [generation]);
    if (failure) throw new Error(seededSecret);
    return (
      <View>
        <Text>{value}</Text>
        <Text>Generation {generation}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change state"
          onPress={() => setValue('Failed state')}
        >
          <Text>Change state</Text>
        </Pressable>
      </View>
    );
  }

  const makeRoot = () => (
    <AppErrorBoundary renderChildren={(generation) => <StatefulRoot generation={generation} />} />
  );
  const view = render(makeRoot());
  fireEvent.press(screen.getByRole('button', {name: 'Change state'}));
  expect(screen.getByText('Failed state')).toBeTruthy();
  failure = true;
  view.rerender(makeRoot());
  expect(screen.getByRole('button', {name: 'Reload'})).toBeTruthy();
  expect(disposed).toEqual([0]);
  failure = false;
  fireEvent.press(screen.getByRole('button', {name: 'Reload'}));
  expect(screen.getByText('Fresh state')).toBeTruthy();
  expect(screen.getByText('Generation 1')).toBeTruthy();
  expect(mounted).toEqual([0, 1]);
});

test('S14 a persistent failure waits for each explicit Reload and rejects stale duplicate presses', () => {
  const attemptedGenerations = new Set<number>();
  const attempts: number[] = [];
  const boundary = createRef<AppErrorBoundary>();
  render(
    <AppErrorBoundary
      ref={boundary}
      renderChildren={(generation) => {
        attemptedGenerations.add(generation);
        attempts.push(generation);
        return <Fault phase="render" />;
      }}
    />,
  );
  expect([...attemptedGenerations]).toEqual([0]);
  const fallback = boundary.current?.render();
  if (!isValidElement(fallback) || !isRecoveryScreenProps(fallback.props)) {
    throw new Error('Expected callable Reload action');
  }
  const oldReload = fallback.props.onReload;
  act(() => {
    oldReload();
    oldReload();
  });
  expect([...attemptedGenerations]).toEqual([0, 1]);
  expect(screen.getByRole('button', {name: 'Reload'})).toBeTruthy();
  const settledAttempts = attempts.length;
  act(() => {
    oldReload();
  });
  expect([...attemptedGenerations]).toEqual([0, 1]);
  expect(attempts).toHaveLength(settledAttempts);
  fireEvent.press(screen.getByRole('button', {name: 'Reload'}));
  expect([...attemptedGenerations]).toEqual([0, 1, 2]);
  expect(screen.getByRole('button', {name: 'Reload'})).toBeTruthy();
});
