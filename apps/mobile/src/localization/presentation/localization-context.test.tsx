import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

import {App} from '../../../App';
import {createAuthRuntime} from '../../auth/auth-runtime';
import {TestGateway, TestClock} from '../../auth/testing/fakes';

import {StrictMode} from 'react';
import {AppState, Text} from 'react-native';
import type {AppStateStatus} from 'react-native';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native';

import {LocalizationProvider, useTextTranslator} from './localization-context';
import {createLocalizationRuntime} from '../localization-runtime';
import {createI18nextTranslator} from '../infrastructure/i18next-translator';
import {englishCatalog} from '../resources/en';
import {MESSAGE} from '../messages';

beforeEach(() => {
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({remove: jest.fn()}));
});

afterEach(() => jest.restoreAllMocks());

function Reader(): React.JSX.Element {
  return <Text>{useTextTranslator().text(MESSAGE.LOGIN_SUBMIT)}</Text>;
}

test('WEA-28 S01 scoped text is usable on the first provider render', () => {
  const createRuntime = () =>
    createLocalizationRuntime({
      translator: createI18nextTranslator({
        catalog: {...englishCatalog, 'login.submit': 'Enter selected workspace'},
      }),
    });

  render(
    <LocalizationProvider createRuntime={createRuntime}>
      <Reader />
    </LocalizationProvider>,
  );
  expect(screen.getByText('Enter selected workspace')).toBeTruthy();
});

test('WEA-28 S07 foreground samples without reallocating and replay/unmount removes owned listeners', () => {
  const samples = jest.fn();
  const remove = jest.fn();
  let onChange: ((state: AppStateStatus) => void) | undefined;
  const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    onChange = callback;

    return {remove};
  });
  const runtime = createLocalizationRuntime();
  const factory = jest.fn(() => ({...runtime, sampleLocale: samples}));
  const view = render(
    <StrictMode>
      <LocalizationProvider createRuntime={factory}>
        <Reader />
      </LocalizationProvider>
    </StrictMode>,
  );
  const constructions = factory.mock.calls.length;

  act(() => onChange?.('active'));
  expect(samples).toHaveBeenCalledTimes(1);
  expect(factory).toHaveBeenCalledTimes(constructions);
  expect(screen.getByText('Log in')).toBeTruthy();
  view.unmount();
  expect(remove).toHaveBeenCalled();
  expect(runtime.translator.text(MESSAGE.LOGIN_SUBMIT)).toBe('Log in');
  spy.mockRestore();
});

test('WEA-28 S06 absent context offers usable pure English', () => {
  render(<Reader />);
  expect(screen.getByText('Log in')).toBeTruthy();
});

test('WEA-28 S06/S07 a localization factory fault reaches provider-free recovery and Reload constructs a fresh root', async () => {
  const diagnostic = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const gateway = new TestGateway();
  let fail = true;
  const createLocalization = jest.fn(() => {
    if (fail) throw new Error('synthetic-localization-fault');

    return createLocalizationRuntime();
  });

  const createAuth = () => createAuthRuntime(gateway, new TestClock());

  const view = render(<App createRuntime={createAuth} createLocalization={createLocalization} />);

  expect(screen.getByRole('button', {name: 'Reload'})).toBeTruthy();
  expect(gateway.requests).toHaveLength(0);

  const before = createLocalization.mock.calls.length;

  fail = false;
  fireEvent.press(screen.getByRole('button', {name: 'Reload'}));
  await waitFor(() => expect(screen.getByText('Welcome back')).toBeTruthy());
  expect(createLocalization.mock.calls.length).toBeGreaterThan(before);
  view.unmount();
  diagnostic.mockRestore();
});
