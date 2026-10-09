import {StyleSheet, Text} from 'react-native';
import {tokens} from '@weave/design-tokens';
export interface FeedbackProps {
  readonly message: string;
  readonly busy?: boolean;
}
export function Feedback({message, busy = false}: FeedbackProps): React.JSX.Element {
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityState={{busy}}
      style={styles.text}
    >
      {message}
    </Text>
  );
}
const styles = StyleSheet.create({
  text: {
    color: tokens.colors.text,
    fontFamily: tokens.fonts.regular,
    fontSize: tokens.typeSizes.supporting,
    lineHeight: 22,
    backgroundColor: tokens.colors.subtleSurface,
    padding: tokens.spacing.compact,
    borderRadius: tokens.radii.control,
  },
});
