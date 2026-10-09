import type {CodegenTypes, TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  execute(command: string, payload: string): Promise<string>;
  readonly onSessionChanged: CodegenTypes.EventEmitter<string>;
}

export const nativeWeaveAuth = TurboModuleRegistry.get<Spec>('WeaveAuth');
