import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

import {AppState, Dimensions, ScrollView, StyleSheet} from 'react-native';
import {render, screen, waitFor} from '@testing-library/react-native';

import {App} from '../../App';
import {createAuthRuntime} from './auth-runtime';
import {TestGateway, TestClock} from './testing/fakes';
import {createLocalizationRuntime} from '../localization/localization-runtime';
import {createI18nextTranslator} from '../localization/infrastructure/i18next-translator';
import {expandedEnglishCatalog} from '../localization/testing/expanded-en';

export const LANDSCAPE_TABLET_WIDTH = 1024;

const original = {window: Dimensions.get('window'), screen: Dimensions.get('screen')};

beforeEach(() =>
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({remove: jest.fn()})),
);

afterEach(() => {
  Dimensions.set(original);
  jest.restoreAllMocks();
});

test.each([
  [390, 844, 1],
  [390, 844, 1.5],
  [390, 844, 2],
  [844, 390, 1],
  [844, 390, 2],
  [768, 1024, 1],
  [768, 1024, 2],
  [1024, 768, 1],
  [1024, 768, 2],
])(
  'WEA-28 S08 expanded text keeps semantic controls and scroll layout at %p/%p font %p',
  async (width, height, fontScale) => {
    Dimensions.set({
      window: {width, height, fontScale, scale: 1},
      screen: {width, height, fontScale, scale: 1},
    });

    const gateway = new TestGateway();
    const view = render(
      <App
        createRuntime={() => createAuthRuntime(gateway, new TestClock())}
        createLocalization={() =>
          createLocalizationRuntime({
            translator: createI18nextTranslator({catalog: expandedEnglishCatalog}),
          })
        }
      />,
    );

    await waitFor(() => expect(screen.getByText('Welcome back Welcome back')).toBeTruthy());
    expect(screen.getByRole('button', {name: 'Log in Log in'})).toBeEnabled();
    expect(screen.getByLabelText('Email Email')).toHaveProp('autoComplete', 'email');
    expect(
      StyleSheet.flatten(view.UNSAFE_getByType(ScrollView).props.contentContainerStyle),
    ).toMatchObject({flexGrow: 1});

    if (width === LANDSCAPE_TABLET_WIDTH) {
      expect(
        screen.getByText('Everything, woven together. Everything, woven together.'),
      ).toBeTruthy();
      expect(screen.getByText(/No more loose threads/)).toBeTruthy();
    }

    view.unmount();
  },
);
