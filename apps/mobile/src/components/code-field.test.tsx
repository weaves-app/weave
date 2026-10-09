import {useState} from 'react';
import {Dimensions} from 'react-native';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {tokens} from '@weave/design-tokens';
import {CodeField} from './code-field';

const defaultWindow = Dimensions.get('window');
const defaultScreen = Dimensions.get('screen');
beforeEach(() => {
  Dimensions.set({window: {...defaultWindow, fontScale: 1}, screen: defaultScreen});
});
afterEach(() => {
  Dimensions.set({window: defaultWindow, screen: defaultScreen});
});

function EditableCode(): React.JSX.Element {
  const [code, setCode] = useState('123456');
  return <CodeField value={code} onChangeText={setCode} />;
}

test('S15/S16 moving the native cursor highlights the digit being corrected', () => {
  render(<EditableCode />);
  const input = screen.getByLabelText('Verification code');
  fireEvent(input, 'focus');
  fireEvent(input, 'selectionChange', {nativeEvent: {selection: {start: 2, end: 2}}});
  expect(screen.getByTestId('code-slot-2', {includeHiddenElements: true})).toHaveStyle({
    borderColor: tokens.colors.focus,
  });
  expect(screen.getByTestId('code-slot-5', {includeHiddenElements: true})).toHaveStyle({
    borderColor: tokens.colors.border,
  });
  fireEvent.changeText(input, '129456');
  fireEvent(input, 'selectionChange', {nativeEvent: {selection: {start: 3, end: 3}}});
  expect(input).toHaveDisplayValue('129456');
  expect(screen.getByTestId('code-slot-3', {includeHiddenElements: true})).toHaveStyle({
    borderColor: tokens.colors.focus,
  });
});

test('S15/S16 a native selection range highlights only its code digits', () => {
  render(<EditableCode />);
  const input = screen.getByLabelText('Verification code');
  fireEvent(input, 'focus');
  fireEvent(input, 'selectionChange', {nativeEvent: {selection: {start: 1, end: 4}}});
  for (const index of [1, 2, 3]) {
    expect(screen.getByTestId(`code-slot-${index}`, {includeHiddenElements: true})).toHaveStyle({
      borderColor: tokens.colors.focus,
    });
  }
  expect(screen.getByTestId('code-slot-0', {includeHiddenElements: true})).toHaveStyle({
    borderColor: tokens.colors.border,
  });
  expect(screen.getByTestId('code-slot-5', {includeHiddenElements: true})).toHaveStyle({
    borderColor: tokens.colors.border,
  });
});
