import {useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import type {TextInputProps} from 'react-native';

import {tokens} from '@weave/design-tokens';

import {INPUT_COLOR} from './input-constants';
import {KEYBOARD_TYPE, AUTO_CAPITALIZE} from './input-constants';

export interface FormFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly secret?: boolean;
  readonly disabled?: boolean;
  readonly keyboardType?: (typeof KEYBOARD_TYPE)[keyof typeof KEYBOARD_TYPE];
  readonly placeholder?: string;
  readonly autoComplete?: TextInputProps['autoComplete'];
}

export function FormField({
  label,
  value,
  onChangeText,
  secret = false,
  disabled = false,
  keyboardType = KEYBOARD_TYPE.DEFAULT,
  placeholder,
  autoComplete,
}: FormFieldProps): React.JSX.Element {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={`field-${label.toLowerCase().replaceAll(' ', '-')}`}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secret}
        editable={!disabled}
        accessibilityState={{disabled}}
        autoCapitalize={AUTO_CAPITALIZE.NONE}
        autoCorrect={false}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        placeholder={placeholder}
        placeholderTextColor={tokens.colors.muted}
        selectionColor={tokens.colors.focus}
        underlineColorAndroid={INPUT_COLOR.TRANSPARENT}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, focused && styles.focused, disabled && styles.disabled]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {gap: tokens.spacing.small},
  label: {
    color: tokens.colors.text,
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.typeSizes.label,
  },
  input: {
    color: tokens.colors.text,
    fontFamily: tokens.fonts.regular,
    fontSize: tokens.typeSizes.supporting,
    backgroundColor: tokens.colors.inputSurface,
    borderColor: tokens.colors.border,
    borderWidth: 1,
    borderRadius: tokens.radii.control,
    minHeight: 52,
    paddingHorizontal: tokens.spacing.medium,
    paddingVertical: tokens.spacing.compact,
  },
  focused: {
    borderColor: tokens.colors.focus,
    borderWidth: 2,
    paddingHorizontal: tokens.spacing.medium - 1,
    paddingVertical: tokens.spacing.compact - 1,
  },
  disabled: {opacity: 0.55},
});
