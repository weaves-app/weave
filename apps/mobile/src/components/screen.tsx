import type {ReactNode} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {tokens} from '@weave/design-tokens';

import {FLEX_ALIGNMENT} from './native-options';

export interface ScreenProps {
  readonly children: ReactNode;
  readonly scrollable?: boolean;
}

export function Screen({children, scrollable = false}: ScreenProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe}>
      {scrollable ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>{children}</ScrollView>
      ) : (
        <View style={styles.content}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: tokens.colors.background},
  scrollContent: {
    flexGrow: 1,
    padding: tokens.spacing.large,
    gap: tokens.spacing.medium,
    justifyContent: FLEX_ALIGNMENT.CENTER,
  },
  content: {
    flex: 1,
    padding: tokens.spacing.large,
    gap: tokens.spacing.medium,
    justifyContent: FLEX_ALIGNMENT.CENTER,
  },
});
