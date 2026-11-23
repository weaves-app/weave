import {nativeWeaveNotifications} from '../../../native/NativeWeaveNotifications';
import type {NativeNotificationTransport} from './native-notification-gateway';

export function createNativeNotificationTransport(): NativeNotificationTransport {
  return {
    execute: async (command, payload) => {
      if (!nativeWeaveNotifications) throw new Error('Notification unavailable');

      return nativeWeaveNotifications.execute(command, payload);
    },

    subscribe: (listener) => {
      const subscription = nativeWeaveNotifications?.onNotificationChanged(listener);

      return () => subscription?.remove();
    },
  };
}
