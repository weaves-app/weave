import {fireEvent, render, screen} from '@testing-library/react-native';

import {FormField} from './form-field';

test('S03/S15 labels secret fields and disables editing while pending', () => {
  const change = jest.fn();
  const {rerender} = render(<FormField label="Password" value="" onChangeText={change} secret />);

  expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', true);
  fireEvent.changeText(screen.getByLabelText('Password'), 'unchanged password ');
  expect(change).toHaveBeenCalledWith('unchanged password ');
  rerender(<FormField label="Password" value="" onChangeText={change} secret disabled />);
  expect(screen.getByLabelText('Password')).toHaveProp('editable', false);
});
