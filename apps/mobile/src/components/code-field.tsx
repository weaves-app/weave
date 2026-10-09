import {useState} from 'react';
import {StyleSheet, Text, TextInput, useWindowDimensions, View} from 'react-native';
import {tokens} from '@weave/design-tokens';
import {Typography} from './typography';

export interface CodeFieldProps {
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly disabled?: boolean;
}

// Android Fabric uses zero-valued transparent black as an unspecified text colour.
const invisibleInk = 'rgba(255, 255, 255, 0)';
const codeLength = 6;
const slots = [0, 1, 2, 3, 4, 5] as const;

export function CodeField({
  value,
  onChangeText,
  disabled = false,
}: CodeFieldProps): React.JSX.Element {
  const [focused, setFocused] = useState(false);
  const [selection, setSelection] = useState({start: value.length, end: value.length});
  const {fontScale} = useWindowDimensions();
  const showSlots = fontScale < 1.5;
  const selectionStart = Math.min(selection.start, value.length);
  const selectionEnd = Math.min(selection.end, value.length);
  const collapsed = selectionStart === selectionEnd;
  const caretSlot = Math.min(selectionStart, codeLength - 1);
  function isActiveSlot(index: number): boolean {
    return (
      focused && (collapsed ? index === caretSlot : index >= selectionStart && index < selectionEnd)
    );
  }
  function changeCode(input: string): void {
    if (!disabled) onChangeText(input.replace(/\D/g, '').slice(0, codeLength));
  }
  return (
    <View style={styles.field}>
      <Typography variant="label">Verification code</Typography>
      <View style={[styles.entry, disabled && styles.disabled]}>
        {showSlots && (
          <View
            style={styles.slots}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {slots.map((index) => (
              <View
                key={index}
                testID={`code-slot-${index}`}
                style={[styles.slot, isActiveSlot(index) && styles.focused]}
              >
                <Text style={styles.digit}>{value[index] ?? ''}</Text>
                {focused && collapsed && index === caretSlot && (
                  <View
                    style={[
                      styles.caret,
                      selectionStart < value.length && styles.caretBeforeDigit,
                      selectionStart === codeLength && styles.caretAfterDigit,
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
        )}
        <TextInput
          testID="field-verification-code"
          accessibilityLabel="Verification code"
          accessibilityHint="Enter or paste the six-digit code from your email"
          accessibilityState={{disabled}}
          value={value}
          onChangeText={changeCode}
          editable={!disabled}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          caretHidden={showSlots}
          selectionColor={showSlots ? invisibleInk : tokens.colors.focus}
          underlineColorAndroid="transparent"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
          style={
            showSlots ? styles.overlayInput : [styles.largeTextInput, focused && styles.focused]
          }
        />
      </View>
      <Typography variant="caption">Enter the 6-digit code from your email.</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {gap: tokens.spacing.small},
  entry: {minHeight: 60},
  slots: {flexDirection: 'row', gap: tokens.spacing.small},
  slot: {
    flex: 1,
    minHeight: 60,
    paddingVertical: tokens.spacing.compact,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.inputSurface,
    borderColor: tokens.colors.border,
    borderWidth: 1,
    borderRadius: tokens.radii.slot,
  },
  focused: {borderColor: tokens.colors.focus, borderWidth: 2},
  digit: {
    fontSize: tokens.typeSizes.code,
    color: tokens.colors.text,
    fontFamily: tokens.fonts.semibold,
  },
  caret: {
    position: 'absolute',
    width: 2,
    height: tokens.typeSizes.code,
    backgroundColor: tokens.colors.text,
  },
  caretBeforeDigit: {left: tokens.spacing.tiny},
  caretAfterDigit: {right: tokens.spacing.tiny},
  overlayInput: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    color: invisibleInk,
    fontSize: tokens.typeSizes.code,
    backgroundColor: 'transparent',
    padding: 0,
  },
  largeTextInput: {
    minHeight: 60,
    borderRadius: tokens.radii.slot,
    borderColor: tokens.colors.border,
    borderWidth: 1,
    padding: tokens.spacing.compact,
    fontSize: tokens.typeSizes.code,
    color: tokens.colors.text,
    backgroundColor: tokens.colors.inputSurface,
    fontFamily: tokens.fonts.semibold,
  },
  disabled: {opacity: 0.55},
});
