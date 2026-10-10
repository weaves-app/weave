import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {NavigationContainerRefWithCurrent} from '@react-navigation/native';

import {NAVIGATION_KEY, ROUTE_NAME} from './routes';
import {Screen} from '../components/screen';
import {Button} from '../components/button';
import {Feedback} from '../components/feedback';
import {useAuthController, useAuthState} from '../auth/presentation/auth-context';
import {authMessages} from '../auth/presentation/auth-messages';
import {LoginScreen} from '../auth/presentation/login-screen';
import {HomeScreen} from '../auth/presentation/home-screen';
import {AUTH_ERROR_CODE, SESSION_STATUS} from '../auth/domain/auth-models';

// React Navigation requires a type alias to preserve its closed route-name union.

export type RootParams = {
  [ROUTE_NAME.LOGIN]: undefined;
  [ROUTE_NAME.HOME]: undefined;
};

export interface RootNavigatorProps {
  readonly navigationRef?: NavigationContainerRefWithCurrent<RootParams>;
}

const Stack = createNativeStackNavigator<RootParams>();

export function RootNavigator({navigationRef}: RootNavigatorProps): React.JSX.Element {
  const state = useAuthState();
  const controller = useAuthController();

  if (state.session.status === SESSION_STATUS.RESOLVING)
    return (
      <Screen>
        <Feedback message="Checking your session…" busy />
      </Screen>
    );

  if (state.session.status === SESSION_STATUS.UNAVAILABLE)
    return (
      <Screen>
        <Feedback message={authMessages[state.error?.code ?? AUTH_ERROR_CODE.UNEXPECTED]} />
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
        {state.session.status === SESSION_STATUS.ACTIVE ? (
          <Stack.Screen
            name={ROUTE_NAME.HOME}
            component={HomeScreen}
            navigationKey={NAVIGATION_KEY.PROTECTED}
          />
        ) : (
          <Stack.Screen
            name={ROUTE_NAME.LOGIN}
            component={LoginScreen}
            navigationKey={NAVIGATION_KEY.PUBLIC}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
