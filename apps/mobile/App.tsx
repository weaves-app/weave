import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {STATUS_BAR_STYLE} from './src/components/native-options';
import {createAuthController} from './src/auth/application/auth-controller';
import type {AuthController} from './src/auth/application/auth-controller';
import {createNativeAuthGateway} from './src/auth/infrastructure/native-auth-gateway';
import {createNativeAuthTransport} from './src/auth/infrastructure/native-auth-transport';
import {systemClock} from './src/auth/infrastructure/system-clock';
import {AuthProvider} from './src/auth/presentation/auth-context';
import {RootNavigator} from './src/navigation/root-navigator';
import {AppErrorBoundary} from './src/recovery/app-error-boundary';

export interface AppProps {
  readonly createController?: () => AuthController;
}

function createController(): AuthController {
  return createAuthController(createNativeAuthGateway(createNativeAuthTransport()), systemClock);
}

export function App({createController: factory = createController}: AppProps): React.JSX.Element {
  return (
    <AppErrorBoundary
      renderChildren={() => (
        <AuthProvider createController={factory}>
          <SafeAreaProvider>
            <RootNavigator />
            <StatusBar barStyle={STATUS_BAR_STYLE.DARK_CONTENT} />
          </SafeAreaProvider>
        </AuthProvider>
      )}
    />
  );
}
