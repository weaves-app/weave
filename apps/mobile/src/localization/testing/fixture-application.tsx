import {useState} from 'react';
import {AppRegistry} from 'react-native';

import {App} from '../../../App';
import {name} from '../../../app.json';
import {createAuthRuntime} from '../../auth/auth-runtime';
import type {AuthRuntime} from '../../auth/auth-runtime';
import {AUTH_RESULT_KIND, CODE_PURPOSE} from '../../auth/domain/auth-models';
import {active, TestClock, TestGateway} from '../../auth/testing/fakes';

export const FIXTURE_SCENARIO = {
  LOGIN: 'login',
  VERIFICATION: 'verification',
  HOME: 'home',
  RETRY: 'retry',
  RECOVERY: 'recovery',
} as const;

export const FIXTURE_RETRY_SECONDS = 60;

export type FixtureScenario = (typeof FIXTURE_SCENARIO)[keyof typeof FIXTURE_SCENARIO];

export interface NativeFixtureProps {
  readonly scenario: FixtureScenario;
}

interface FixtureAuthFactory {
  (): AuthRuntime;
}

function createFixtureAuthFactory(scenario: FixtureScenario): FixtureAuthFactory {
  let failOnce = scenario === FIXTURE_SCENARIO.RECOVERY;

  return (): AuthRuntime => {
    if (failOnce) {
      failOnce = false;

      throw new Error('Synthetic fixture recovery');
    }

    const gateway = new TestGateway();

    if (scenario === FIXTURE_SCENARIO.HOME) gateway.resolveResult = async (input) => active(input);

    if (scenario === FIXTURE_SCENARIO.VERIFICATION || scenario === FIXTURE_SCENARIO.RETRY)
      gateway.loginResult = async () => ({
        kind: AUTH_RESULT_KIND.CHALLENGE,
        attemptId: 'fixture-attempt',
        codePurpose: CODE_PURPOSE.SIGN_IN,
        retryAfterSeconds: scenario === FIXTURE_SCENARIO.RETRY ? FIXTURE_RETRY_SECONDS : undefined,
      });

    return createAuthRuntime(gateway, new TestClock());
  };
}

export function NativeFixtureApp({scenario}: NativeFixtureProps): React.JSX.Element {
  const [factory] = useState(() => createFixtureAuthFactory(scenario));

  return <App createRuntime={factory} />;
}

export function registerNativeFixture(scenario: FixtureScenario): void {
  function FixtureRoot(): React.JSX.Element {
    return <NativeFixtureApp scenario={scenario} />;
  }

  AppRegistry.registerComponent(name, () => FixtureRoot);
}
