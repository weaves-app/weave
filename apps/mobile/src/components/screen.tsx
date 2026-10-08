import type {ReactNode} from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {tokens} from '@weave/design-tokens';

export interface ScreenProps {
  readonly children: ReactNode;
}

export function Screen({children}: ScreenProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: tokens.colors.background},
  content: {
    flex: 1,
    padding: tokens.spacing.large,
    gap: tokens.spacing.medium,
    justifyContent: 'center',
  },
});
