import type {ReactNode} from 'react';
import {StyleSheet, Text} from 'react-native';

import {tokens} from '@weave/design-tokens';

export interface TypographyProps {
  readonly children: ReactNode;
  readonly variant?: 'title' | 'body';
}

export function Typography({children, variant = 'body'}: TypographyProps): React.JSX.Element {
  return (
    <Text accessibilityRole={variant === 'title' ? 'header' : undefined} style={styles[variant]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: 36, fontWeight: '700', color: tokens.colors.text},
  body: {fontSize: 18, color: tokens.colors.muted},
});
