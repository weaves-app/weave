import type {CodegenTypes, TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  execute(command: string, payload: string): Promise<string>;
  readonly onNotificationChanged: CodegenTypes.EventEmitter<string>;
}

// Framework codegen requires a literal module name. JSON is validated in the adapter.
export const nativeWeaveNotifications = TurboModuleRegistry.get<Spec>('WeaveNotifications');
