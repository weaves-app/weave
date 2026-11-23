import type {ReactNode} from 'react';
import {StyleSheet, Text} from 'react-native';

import {tokens} from '@weave/design-tokens';

import {ACCESSIBILITY_ROLE} from './native-options';

export const VARIANT = {
  TITLE: 'title',
  BODY: 'body',
  HEADING: 'heading',
  SUPPORTING: 'supporting',
  LABEL: 'label',
  CAPTION: 'caption',
} as const;

export interface TypographyProps {
  readonly children: ReactNode;
  readonly variant?: (typeof VARIANT)[keyof typeof VARIANT];
}

export function Typography({children, variant = VARIANT.BODY}: TypographyProps): React.JSX.Element {
  return (
    <Text
      accessibilityRole={
        variant === VARIANT.TITLE || variant === VARIANT.HEADING
          ? ACCESSIBILITY_ROLE.HEADER
          : undefined
      }
      style={styles[variant]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: 36, fontFamily: tokens.fonts.bold, color: tokens.colors.text},
  body: {fontSize: 18, fontFamily: tokens.fonts.regular, color: tokens.colors.muted},
  heading: {
    fontSize: tokens.typeSizes.heading,
    fontFamily: tokens.fonts.bold,
    color: tokens.colors.text,
    letterSpacing: -0.7,
  },
  supporting: {
    fontSize: tokens.typeSizes.supporting,
    fontFamily: tokens.fonts.regular,
    color: tokens.colors.muted,
    lineHeight: 23,
  },
  label: {
    fontSize: tokens.typeSizes.label,
    fontFamily: tokens.fonts.semibold,
    color: tokens.colors.text,
  },
  caption: {
    fontSize: tokens.typeSizes.caption,
    fontFamily: tokens.fonts.regular,
    color: tokens.colors.muted,
    lineHeight: 18,
  },
});
