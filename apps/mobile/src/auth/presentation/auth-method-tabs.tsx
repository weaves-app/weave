import {Pressable, StyleSheet, Text, View} from 'react-native';
import {tokens} from '@weave/design-tokens';
import type {AuthMethod} from '../domain/auth-models';

export interface AuthMethodTabsProps {
  readonly method: AuthMethod;
  readonly disabled: boolean;
  readonly onSelect: (method: AuthMethod) => void;
}

export function AuthMethodTabs({
  method,
  disabled,
  onSelect,
}: AuthMethodTabsProps): React.JSX.Element {
  const emailCodeSelected = method === 'emailCode';
  return (
    <View style={styles.tabs}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Email and password"
        accessibilityState={{disabled, selected: !emailCodeSelected}}
        disabled={disabled}
        onPress={() => onSelect('password')}
        style={[styles.tab, !emailCodeSelected && styles.selected, disabled && styles.disabled]}
      >
        <Text style={[styles.label, !emailCodeSelected && styles.selectedLabel]}>Password</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Email code"
        accessibilityState={{disabled, selected: emailCodeSelected}}
        disabled={disabled}
        onPress={() => onSelect('emailCode')}
        style={[styles.tab, emailCodeSelected && styles.selected, disabled && styles.disabled]}
      >
        <Text style={[styles.label, emailCodeSelected && styles.selectedLabel]}>Email code</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    padding: tokens.spacing.tiny,
    borderRadius: tokens.radii.slot,
    backgroundColor: tokens.colors.subtleSurface,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    padding: tokens.spacing.small,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radii.control,
  },
  selected: {backgroundColor: tokens.colors.surface},
  label: {
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.typeSizes.label,
    color: tokens.colors.muted,
  },
  selectedLabel: {color: tokens.colors.text},
  disabled: {opacity: 0.55},
});
