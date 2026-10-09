import {useEffect, useState} from 'react';
import {Keyboard} from 'react-native';

import {useAuthController, useAuthState} from './auth-context';
import type {AuthMethod, AuthViewState} from '../domain/auth-models';

export interface LoginBindings {
  readonly state: AuthViewState;
  readonly email: string;
  readonly setEmail: (value: string) => void;
  readonly password: string;
  readonly setPassword: (value: string) => void;
  readonly code: string;
  readonly setCode: (value: string) => void;
  readonly selectMethod: (method: AuthMethod) => void;
  readonly submit: () => void;
  readonly google: () => void;
  readonly resend: () => void;
}

export function useLogin(): LoginBindings {
  const controller = useAuthController();
  const state = useAuthState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    setPassword('');
    setCode('');
  }, [state.attempt.method, state.attempt.attemptId]);

  function selectMethod(method: AuthMethod): void {
    setPassword('');
    setCode('');
    controller.selectMethod(method);
  }

  function submit(): void {
    if (state.pending) return;

    const submittedPassword = password;
    const submittedCode = code;

    setPassword('');
    setCode('');

    if (state.attempt.attemptId) void controller.verify(submittedCode);
    else void controller.login(state.attempt.method, email, submittedPassword);
  }

  function google(): void {
    setPassword('');
    setCode('');
    void controller.login('google');
  }

  function changeCode(value: string): void {
    if (state.pending) return;

    setCode(value);

    if (value.length === 6 && state.attempt.attemptId) {
      setCode('');
      Keyboard.dismiss();
      void controller.verify(value);
    }
  }

  return {
    state,
    email,
    setEmail,
    password,
    setPassword,
    code,
    setCode: changeCode,
    selectMethod,
    submit,
    google,

    resend: () => {
      void controller.resend();
    },
  };
}
