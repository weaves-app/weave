import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {Screen} from '../components/screen';
import {Button} from '../components/button';
import {Feedback} from '../components/feedback';
import {useAuthController, useAuthState} from '../auth/presentation/auth-context';
import {authMessages} from '../auth/presentation/auth-messages';
import {LoginScreen} from '../auth/presentation/login-screen';
import {HomeScreen} from '../auth/presentation/home-screen';

import type {NavigationContainerRefWithCurrent} from '@react-navigation/native';

// React Navigation requires a type alias to preserve its closed route-name union.

export type RootParams = {Login: undefined; Home: undefined};

export interface RootNavigatorProps {
  readonly navigationRef?: NavigationContainerRefWithCurrent<RootParams>;
}

const Stack = createNativeStackNavigator<RootParams>();

export function RootNavigator({navigationRef}: RootNavigatorProps): React.JSX.Element {
  const state = useAuthState();
  const controller = useAuthController();

  if (state.session.status === 'resolving')
    return (
      <Screen>
        <Feedback message="Checking your session…" busy />
      </Screen>
    );

  if (state.session.status === 'unavailable')
    return (
      <Screen>
        <Feedback message={authMessages[state.error?.code ?? 'unexpected']} />
        <Button
          label="Try again"
          onPress={() => {
            void controller.refresh();
          }}
        />
      </Screen>
    );

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {state.session.status === 'active' ? (
          <Stack.Screen name="Home" component={HomeScreen} navigationKey="protected" />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} navigationKey="public" />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
