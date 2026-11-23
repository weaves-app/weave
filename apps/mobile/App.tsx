import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {STATUS_BAR_STYLE} from './src/components/native-options';
import {createAuthRuntime} from './src/auth/auth-runtime';
import type {AuthRuntime} from './src/auth/auth-runtime';
import {createNativeAuthGateway} from './src/auth/infrastructure/native-auth-gateway';
import {createNativeAuthTransport} from './src/auth/infrastructure/native-auth-transport';
import {systemClock} from './src/auth/infrastructure/system-clock';
import {AuthProvider} from './src/auth/presentation/auth-context';
import {RootNavigator} from './src/navigation/root-navigator';
import {AppErrorBoundary} from './src/recovery/app-error-boundary';

export interface AppProps {
  readonly createRuntime?: () => AuthRuntime;
}

function createRuntime(): AuthRuntime {
  return createAuthRuntime(createNativeAuthGateway(createNativeAuthTransport()), systemClock);
}

export function App({createRuntime: factory = createRuntime}: AppProps): React.JSX.Element {
  return (
    <AppErrorBoundary
      renderChildren={() => (
        <SafeAreaProvider>
          <AuthProvider createRuntime={factory}>
            <RootNavigator />
            <StatusBar barStyle={STATUS_BAR_STYLE.DARK_CONTENT} />
          </AuthProvider>
        </SafeAreaProvider>
      )}
    />
  );
}
