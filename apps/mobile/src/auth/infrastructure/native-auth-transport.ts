import {AUTH_ERROR_CODE, AUTH_RESULT_KIND} from '../domain/auth-models';

import {nativeWeaveAuth} from '../../native/NativeWeaveAuth';
import type {NativeAuthTransport} from './native-auth-gateway';

export function createNativeAuthTransport(): NativeAuthTransport {
  return {
    execute: async (command, payload) =>
      nativeWeaveAuth
        ? nativeWeaveAuth.execute(command, payload)
        : JSON.stringify({kind: AUTH_RESULT_KIND.ERROR, code: AUTH_ERROR_CODE.CONFIGURATION}),

    subscribe: (observer) => {
      const subscription = nativeWeaveAuth?.onSessionChanged(observer);

      return () => subscription?.remove();
    },
  };
}
