import {render, screen} from '@testing-library/react-native';

import {Typography} from './typography';

test('S08 title exposes heading semantics and body text remains readable', () => {
  render(
    <>
      <Typography variant="title">Weave</Typography>
      <Typography>Your workspace</Typography>
    </>,
  );
  expect(screen.getByRole('header', {name: 'Weave'})).toBeTruthy();
  expect(screen.getByText('Your workspace')).toBeTruthy();
});
