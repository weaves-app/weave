import {execFileSync} from 'node:child_process';
import path from 'node:path';
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

import {AppState} from 'react-native';
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';

import {expandedEnglishCatalog} from './expanded-en';
import {NativeFixtureApp} from './fixture-application';
import {englishCatalog} from '../resources/en';
import {validateEnglishCatalog} from '../messages';

function evaluateConfig(script: string, scenario: string | undefined): string {
  return execFileSync(
    process.execPath,
    ['-e', `const config=require('./metro.i18n-fixture.config.cjs'); ${script}`],
    {
      cwd: path.resolve(__dirname, '../../..'),
      env: {...process.env, WEAVE_I18N_FIXTURE_SCENARIO: scenario},
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  ).trim();
}

beforeEach(() =>
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({remove: jest.fn()})),
);

afterEach(() => jest.restoreAllMocks());

test('WEA-28 S08 explicit fixture config rewrites only native entry URLs and preserves platform/source maps', () => {
  expect(
    evaluateConfig(
      "console.log(config.server.rewriteRequestUrl('/index.bundle?platform=android&dev=true'))",
      'login',
    ),
  ).toBe('/src/localization/testing/native-entries/login.bundle?platform=android&dev=true');
  expect(
    evaluateConfig(
      "console.log(config.server.rewriteRequestUrl('http://localhost:8081/index.map?platform=ios'))",
      'home',
    ),
  ).toBe('http://localhost:8081/src/localization/testing/native-entries/home.map?platform=ios');
  expect(
    evaluateConfig(
      "console.log(config.server.rewriteRequestUrl('/assets/logo.png?platform=ios'))",
      'login',
    ),
  ).toBe('/assets/logo.png?platform=ios');
});

test.each([undefined, 'unknown', '../index'])(
  'WEA-28 S08 unknown fixture scenario %p is rejected',
  (scenario) => {
    expect(() => evaluateConfig('console.log("unexpected success")', scenario)).toThrow();
  },
);

test('WEA-28 S08 resolver redirects canonical English only outside the expanded module itself', () => {
  const script = `const path=require('node:path'); const canonical=path.resolve('src/localization/resources/en.ts'); const expanded=path.resolve('src/localization/testing/expanded-en.ts'); const context={originModulePath:path.resolve('src/localization/safe-english.ts'),resolveRequest:()=>({type:'sourceFile',filePath:canonical})}; console.log(config.resolver.resolveRequest(context,'../resources/en','ios').filePath.replace(process.cwd(),'')); context.originModulePath=expanded; console.log(config.resolver.resolveRequest(context,'../resources/en','ios').filePath.replace(process.cwd(),''));`;

  expect(evaluateConfig(script, 'login')).toBe(
    '/src/localization/testing/expanded-en.ts\n/src/localization/resources/en.ts',
  );
});

test('WEA-28 S08 expanded catalog is complete, immutable and approximately doubles every message without extra count markers', () => {
  expect(validateEnglishCatalog(expandedEnglishCatalog)).toEqual([]);

  for (const [id, original] of Object.entries(englishCatalog)) {
    const expanded = expandedEnglishCatalog[id as keyof typeof expandedEnglishCatalog];

    expect(expanded.split(/\s+/).length).toBeGreaterThanOrEqual(original.split(/\s+/).length * 1.5);
  }

  expect(englishCatalog['login.submit']).toBe('Log in');
  expect(Object.isFrozen(expandedEnglishCatalog)).toBe(true);
});

test('WEA-28 S08 native fixture composes the actual Login and verification journey', async () => {
  render(<NativeFixtureApp scenario="verification" />);
  await waitFor(() => expect(screen.getByRole('button', {name: 'Email code'})).toBeTruthy());
  fireEvent.press(screen.getByRole('button', {name: 'Email code'}));
  fireEvent.changeText(screen.getByLabelText('Email'), 'fixture@example.test');
  fireEvent.press(screen.getByRole('button', {name: 'Send code'}));
  await waitFor(() => expect(screen.getByText('Check your email')).toBeTruthy());
  expect(screen.getByLabelText('Verification code')).toBeTruthy();
});

test('WEA-28 S08 native Home fixture signs out through the actual action', async () => {
  render(<NativeFixtureApp scenario="home" />);
  await waitFor(() => expect(screen.getByRole('button', {name: 'Logout'})).toBeTruthy());
  fireEvent.press(screen.getByRole('button', {name: 'Logout'}));
  await waitFor(() => expect(screen.getByText('Welcome back')).toBeTruthy());
});

test('WEA-28 S08 native retry fixture uses the existing challenge countdown path', async () => {
  render(<NativeFixtureApp scenario="retry" />);
  await waitFor(() => expect(screen.getByRole('button', {name: 'Email code'})).toBeTruthy());
  fireEvent.press(screen.getByRole('button', {name: 'Email code'}));
  fireEvent.changeText(screen.getByLabelText('Email'), 'fixture@example.test');
  fireEvent.press(screen.getByRole('button', {name: 'Send code'}));
  await waitFor(() => expect(screen.getByText('Try again after 60 seconds.')).toBeTruthy());
});

test('WEA-28 S08 native recovery fixture reaches the real boundary and Reload restores Login', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  render(<NativeFixtureApp scenario="recovery" />);
  fireEvent.press(screen.getByRole('button', {name: 'Reload'}));
  await waitFor(() => expect(screen.getByText('Welcome back')).toBeTruthy());
});
