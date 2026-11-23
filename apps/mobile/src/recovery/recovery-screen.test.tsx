import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

jest.mock('../localization/resources/en', () => ({
  englishCatalog: {
    'recovery.title': 'Fixture recovery heading',
    'recovery.description': 'Fixture recovery information',
    'recovery.reload': 'Reload this fixture',
  },
}));

import {fireEvent, render, screen} from '@testing-library/react-native';

import {RecoveryScreen} from './recovery-screen';

test('WEA-28 S06 actual recovery uses pure bundled English without a normal provider or engine', () => {
  const reload = jest.fn();

  render(<RecoveryScreen onReload={reload} />);
  expect(screen.getByText('Fixture recovery heading')).toBeTruthy();
  expect(screen.getByRole('alert')).toHaveTextContent('Fixture recovery information');
  fireEvent.press(screen.getByRole('button', {name: 'Reload this fixture'}));
  expect(reload).toHaveBeenCalledTimes(1);
});
