import {Dimensions, ScrollView, StyleSheet} from 'react-native';
import {initialWindowMetrics, SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {tokens} from '@weave/design-tokens';
import {Button} from '../components/button';
import {Feedback} from '../components/feedback';
import {Typography} from '../components/typography';

export interface RecoveryScreenProps {
  readonly onReload: () => void;
}

const windowDimensions = Dimensions.get('window');
const initialMetrics = initialWindowMetrics ?? {
  frame: {x: 0, y: 0, width: windowDimensions.width, height: windowDimensions.height},
  insets: {top: 0, right: 0, bottom: 0, left: 0},
};

export function RecoveryScreen({onReload}: RecoveryScreenProps): React.JSX.Element {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Typography variant="title">Something went wrong</Typography>
          <Feedback message="The app could not display this screen. Reload to try again." />
          <Button label="Reload" onPress={onReload} />
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: tokens.colors.background},
  content: {
    flexGrow: 1,
    padding: tokens.spacing.large,
    gap: tokens.spacing.medium,
    justifyContent: 'center',
  },
});
