import {nativeWeaveAuth} from '../../native/NativeWeaveAuth';
import type {NativeAuthTransport} from './native-auth-gateway';
export function createNativeAuthTransport(): NativeAuthTransport {
  return {
    execute: async (command, payload) =>
      nativeWeaveAuth
        ? nativeWeaveAuth.execute(command, payload)
        : JSON.stringify({kind: 'error', code: 'configuration'}),
    subscribe: (observer) => {
      const subscription = nativeWeaveAuth?.onSessionChanged(observer);
      return () => subscription?.remove();
    },
  };
}
