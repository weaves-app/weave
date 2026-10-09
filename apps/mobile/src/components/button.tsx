import type {ReactNode} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';

import {tokens} from '@weave/design-tokens';

export interface ButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly variant?: 'primary' | 'outline' | 'text';
  readonly leading?: ReactNode;
  readonly trailing?: ReactNode;
}

export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  leading,
  trailing,
}: ButtonProps): React.JSX.Element {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
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
          color={variant === 'primary' ? tokens.colors.onPrimary : tokens.colors.text}
        />
      ) : (
        <View style={styles.content}>
          {leading}
          <Text style={[styles.label, variant !== 'primary' && styles.secondaryLabel]}>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {backgroundColor: tokens.colors.primary},
  outline: {
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.border,
    borderWidth: 1,
  },
  text: {backgroundColor: 'transparent'},
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.compact,
  },
  pressed: {opacity: 0.8},
  inactive: {opacity: 0.5},
  label: {
    color: tokens.colors.onPrimary,
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.typeSizes.supporting,
    flexShrink: 1,
    textAlign: 'center',
  },
  secondaryLabel: {color: tokens.colors.text},
});
