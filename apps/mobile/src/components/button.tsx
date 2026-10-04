import {ActivityIndicator, Pressable, StyleSheet, Text} from 'react-native';
import {tokens} from '@weave/design-tokens';
export interface ButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly loading?: boolean;
}
export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
}: ButtonProps): React.JSX.Element {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled: inactive, busy: loading}}
      disabled={inactive}
      onPress={onPress}
      style={[styles.button, inactive && styles.inactive]}
    >
      {loading ? (
        <ActivityIndicator color={tokens.colors.onPrimary} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    backgroundColor: tokens.colors.primary,
    padding: tokens.spacing.medium,
    borderRadius: tokens.radius,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactive: {opacity: 0.5},
  label: {color: tokens.colors.onPrimary, fontWeight: '600'},
});
