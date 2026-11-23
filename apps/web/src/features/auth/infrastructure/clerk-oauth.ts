import {
  CLERK_COMPLETE_STATUS,
  CLERK_MISSING_REQUIREMENTS_STATUS,
  NO_MISSING_FIELDS,
  CLERK_CLIENT_TRUST_STATUS,
  CLERK_SECOND_FACTOR_STATUS,
} from './clerk-constants';

import {pendingTaskMessage} from '../application/session-task';

import type {SignInFutureResource, SignUpFutureResource} from '@clerk/nextjs/types';

import type {CallbackResult, OAuthGateway} from '../application/contracts';

import {SESSION_TASK, AUTH_MODE} from '../application/auth-constants';

export interface OAuthResources {
  readonly signIn: Pick<
    SignInFutureResource,
    'status' | 'isTransferable' | 'existingSession' | 'create' | 'finalize'
  >;
  readonly signUp: Pick<
    SignUpFutureResource,
    | 'status'
    | 'isTransferable'
    | 'existingSession'
    | 'missingFields'
    | 'unverifiedFields'
    | 'create'
    | 'finalize'
  >;
  readonly signedIn: boolean;
  readonly pendingTask?: string;
  activateExisting(
    sessionId: string,
    navigate: NonNullable<Parameters<SignUpFutureResource['finalize']>[0]>['navigate'],
  ): Promise<void>;
}

export function createOAuthGateway(resources: OAuthResources): OAuthGateway {
  // Keep one attempt across provider signal updates and React effect replay.
  let attempt: Promise<CallbackResult> | undefined;

  const resolve = async (): Promise<CallbackResult> => {
    const fallback = {error: 'Google authentication could not finish. Please try again.'};
    let result: CallbackResult = fallback;

    const navigate: NonNullable<Parameters<SignUpFutureResource['finalize']>[0]>['navigate'] = ({
      session,
      decorateUrl,
    }) => {
      result =
        session?.currentTask && session.currentTask.key !== SESSION_TASK.CHOOSE_ORGANIZATION
          ? {
              error: pendingTaskMessage(session.currentTask.key),
            }
          : {destination: decorateUrl('/organizations')};
    };

    const finalize = async (mode: 'signup' | 'signin'): Promise<CallbackResult> => {
      const {error} = await (
        mode === AUTH_MODE.SIGN_IN ? resources.signIn : resources.signUp
      ).finalize({
        navigate,
      });

      if (error) throw error;

      return result;
    };

    const signinComplete = (): boolean => resources.signIn.status === CLERK_COMPLETE_STATUS;

    if (resources.pendingTask === SESSION_TASK.CHOOSE_ORGANIZATION)
      return {destination: '/organizations'};

    if (resources.pendingTask) return {error: pendingTaskMessage(resources.pendingTask)};

    if (resources.signedIn) return {destination: '/organizations'};

    if (signinComplete()) return finalize('signin');

    if (resources.signUp.isTransferable) {
      const {error} = await resources.signIn.create({transfer: true});

      if (error) throw error;

      if (signinComplete()) return finalize('signin');
    } else if (resources.signIn.isTransferable) {
      const {error} = await resources.signUp.create({transfer: true});

      if (error) throw error;
    }

    if (resources.signUp.status === CLERK_COMPLETE_STATUS) return finalize('signup');

    const existing = resources.signIn.existingSession ?? resources.signUp.existingSession;

    if (existing) {
      await resources.activateExisting(existing.sessionId, navigate);

      return result;
    }

    if (resources.signUp.status === CLERK_MISSING_REQUIREMENTS_STATUS) {
      if (resources.signUp.missingFields.length > NO_MISSING_FIELDS)
        return {
          error: `Google sign-up requires additional information: ${resources.signUp.missingFields.map((field) => field.replaceAll('_', ' ')).join(', ')}. Contact your workspace administrator to complete these requirements.`,
        };

      if (resources.signUp.unverifiedFields.includes('email_address'))
        return {destination: '/sign-up'};
    }

    if (
      resources.signIn.status === CLERK_CLIENT_TRUST_STATUS ||
      resources.signIn.status === CLERK_SECOND_FACTOR_STATUS
    )
      return {destination: '/sign-in'};

    return fallback;
  };

  return {
    finish: () => {
      attempt ??= resolve();

      return attempt;
    },
  };
}
