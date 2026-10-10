import {Pressable, StyleSheet, Text, View} from 'react-native';

import {tokens} from '@weave/design-tokens';

import {ACCESSIBILITY_ROLE, FLEX_ALIGNMENT, FLEX_DIRECTION} from '../../components/native-options';
import type {AuthMethod} from '../domain/auth-models';
import {AUTH_METHOD} from '../domain/auth-models';

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
  const emailCodeSelected = method === AUTH_METHOD.EMAIL_CODE;

  return (
    <View style={styles.tabs}>
      <Pressable
        accessibilityRole={ACCESSIBILITY_ROLE.BUTTON}
        accessibilityLabel="Email and password"
        accessibilityState={{disabled, selected: !emailCodeSelected}}
        disabled={disabled}
        onPress={() => onSelect(AUTH_METHOD.PASSWORD)}
        style={[styles.tab, !emailCodeSelected && styles.selected, disabled && styles.disabled]}
      >
        <Text style={[styles.label, !emailCodeSelected && styles.selectedLabel]}>Password</Text>
      </Pressable>
      <Pressable
        accessibilityRole={ACCESSIBILITY_ROLE.BUTTON}
        accessibilityLabel="Email code"
        accessibilityState={{disabled, selected: emailCodeSelected}}
        disabled={disabled}
        onPress={() => onSelect(AUTH_METHOD.EMAIL_CODE)}
        style={[styles.tab, emailCodeSelected && styles.selected, disabled && styles.disabled]}
      >
        <Text style={[styles.label, emailCodeSelected && styles.selectedLabel]}>Email code</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: FLEX_DIRECTION.ROW,
    padding: tokens.spacing.tiny,
    borderRadius: tokens.radii.slot,
    backgroundColor: tokens.colors.subtleSurface,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    padding: tokens.spacing.small,
    alignItems: FLEX_ALIGNMENT.CENTER,
    justifyContent: FLEX_ALIGNMENT.CENTER,
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
