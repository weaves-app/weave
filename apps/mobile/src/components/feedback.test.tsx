import {render, screen} from '@testing-library/react-native';

import {Feedback} from './feedback';

test('S15 feedback announces validation and pending status', () => {
  render(<Feedback message="Check your email address" busy />);
  expect(screen.getByRole('alert')).toHaveProp('accessibilityLiveRegion', 'polite');
  expect(screen.getByRole('alert')).toHaveProp('accessibilityState', {busy: true});
  expect(screen.getByText('Check your email address')).toBeTruthy();
});
