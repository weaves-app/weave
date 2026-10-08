import {fireEvent, render, screen} from '@testing-library/react-native';

import {Button} from './button';

test('S08 accessible button presses once and disables interaction for disabled/loading', () => {
  const press = jest.fn();
  const {rerender} = render(<Button label="Continue" onPress={press} />);

  fireEvent.press(screen.getByRole('button', {name: 'Continue'}));
  expect(press).toHaveBeenCalledTimes(1);
  rerender(<Button label="Continue" onPress={press} disabled />);
  fireEvent.press(screen.getByRole('button', {name: 'Continue'}));
  expect(press).toHaveBeenCalledTimes(1);
  rerender(<Button label="Continue" onPress={press} loading />);
  fireEvent.press(screen.getByRole('button', {name: 'Continue'}));
  expect(press).toHaveBeenCalledTimes(1);
});
