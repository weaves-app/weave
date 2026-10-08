import {useState} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {Button} from './src/components/button';
import {Screen} from './src/components/screen';
import {Typography} from './src/components/typography';

export function App(): React.JSX.Element {
  const [ready, setReady] = useState(false);

  return (
    <SafeAreaProvider>
      <Screen>
        <Typography variant="title">Weave</Typography>
        <Typography>Your mobile workspace is ready.</Typography>
        <Button
          label={ready ? 'Ready to weave' : 'Explore workspace'}
          onPress={() => setReady(true)}
        />
        <StatusBar barStyle="dark-content" />
      </Screen>
    </SafeAreaProvider>
  );
}
