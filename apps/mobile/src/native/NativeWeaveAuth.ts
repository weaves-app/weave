import type {CodegenTypes, TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  execute(command: string, payload: string): Promise<string>;
  readonly onSessionChanged: CodegenTypes.EventEmitter<string>;
}

// React Native codegen requires the registry module name to be a string literal.
export const nativeWeaveAuth = TurboModuleRegistry.get<Spec>('WeaveAuth');
