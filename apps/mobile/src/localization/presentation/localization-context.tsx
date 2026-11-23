import {createContext, useContext, useEffect, useState} from 'react';
import type {ReactNode} from 'react';
import {AppState} from 'react-native';

import {APP_STATE, NATIVE_EVENT} from '../../components/native-options';
import {createLocalizationRuntime} from '../localization-runtime';
import type {LocalizationFactory} from '../localization-runtime';
import type {TextTranslator} from '../application/text-translator';
import {createSafeEnglishTranslator} from '../safe-english';

const LocalizationContext = createContext<TextTranslator | undefined>(undefined);

const safeEnglish = createSafeEnglishTranslator();

export interface LocalizationProviderProps {
  readonly children: ReactNode;
  readonly createRuntime?: LocalizationFactory;
}

export function LocalizationProvider({
  children,
  createRuntime = createLocalizationRuntime,
}: LocalizationProviderProps): React.JSX.Element {
  const [runtime] = useState(() => createRuntime());

  useEffect(() => {
    const subscription = AppState.addEventListener(NATIVE_EVENT.APP_STATE_CHANGE, (state) => {
      if (state === APP_STATE.ACTIVE) runtime.sampleLocale();
    });

    return () => subscription.remove();
  }, [runtime]);

  return (
    <LocalizationContext.Provider value={runtime.translator}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useTextTranslator(): TextTranslator {
  return useContext(LocalizationContext) ?? safeEnglish;
}
