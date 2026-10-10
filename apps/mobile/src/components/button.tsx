import type {ReactNode} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';

import {tokens} from '@weave/design-tokens';

import {INPUT_COLOR} from './input-constants';
import {ACCESSIBILITY_ROLE, FLEX_ALIGNMENT, FLEX_DIRECTION} from './native-options';

export const BUTTON_VARIANT = {
  PRIMARY: 'primary',
  OUTLINE: 'outline',
  TEXT: 'text',
} as const;

export interface ButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly variant?: (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];
  readonly leading?: ReactNode;
  readonly trailing?: ReactNode;
}

export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = BUTTON_VARIANT.PRIMARY,
  leading,
  trailing,
}: ButtonProps): React.JSX.Element {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole={ACCESSIBILITY_ROLE.BUTTON}
      accessibilityLabel={label}
      accessibilityState={{disabled: inactive, busy: loading}}
      disabled={inactive}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        styles[variant],
        inactive && styles.inactive,
        pressed && !inactive && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === BUTTON_VARIANT.PRIMARY ? tokens.colors.onPrimary : tokens.colors.text}
        />
      ) : (
        <View style={styles.content}>
          {leading}
          <Text style={[styles.label, variant !== BUTTON_VARIANT.PRIMARY && styles.secondaryLabel]}>
            {label}
          </Text>
          {trailing}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: tokens.spacing.medium,
    paddingVertical: tokens.spacing.compact,
    borderRadius: tokens.radii.control,
    minHeight: 52,
    alignItems: FLEX_ALIGNMENT.CENTER,
    justifyContent: FLEX_ALIGNMENT.CENTER,
  },
  primary: {backgroundColor: tokens.colors.primary},
  outline: {
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.border,
    borderWidth: 1,
  },
  text: {backgroundColor: INPUT_COLOR.TRANSPARENT},
  content: {
    flexDirection: FLEX_DIRECTION.ROW,
    alignItems: FLEX_ALIGNMENT.CENTER,
    justifyContent: FLEX_ALIGNMENT.CENTER,
    gap: tokens.spacing.compact,
  },
  pressed: {opacity: 0.8},
  inactive: {opacity: 0.5},
  label: {
    color: tokens.colors.onPrimary,
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.typeSizes.supporting,
    flexShrink: 1,
    textAlign: FLEX_ALIGNMENT.CENTER,
  },
  secondaryLabel: {color: tokens.colors.text},
});
