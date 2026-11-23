import {
  CLERK_COMPLETE_STATUS,
  CLERK_VERIFIED_STATUS,
  CLERK_MISSING_REQUIREMENTS_STATUS,
  NO_MISSING_FIELDS,
  CLERK_CLIENT_TRUST_STATUS,
  CLERK_SECOND_FACTOR_STATUS,
  CLERK_EMAIL_CODE_STRATEGY,
} from './clerk-constants';

import type {SignInFutureResource, SignUpFutureResource} from '@clerk/nextjs/types';

import type {Attempt, AuthGateway} from '../application/contracts';

import {AUTH_MODE, AUTH_STAGE, SESSION_TASK} from '../application/auth-constants';

export interface ClerkResources {
  readonly signUp: Pick<
    SignUpFutureResource,
    | 'sso'
    | 'status'
    | 'missingFields'
    | 'unverifiedFields'
    | 'verifications'
    | 'password'
    | 'create'
    | 'finalize'
  >;

  readonly signIn: Pick<
    SignInFutureResource,
    'sso' | 'status' | 'supportedSecondFactors' | 'mfa' | 'password' | 'finalize'
  >;

  signOut(): Promise<void>;
}

async function requireSuccess(result: Promise<{readonly error: unknown}>): Promise<void> {
  const {error} = await result;

  if (error) throw error;
}

export function createClerkGateway(resources: ClerkResources): AuthGateway {
  const signupState = (): Attempt => {
    const up = resources.signUp;

    if (up.status === CLERK_COMPLETE_STATUS)
      return {
        stage: 'ready',
        verified: up.verifications.emailAddress.status === CLERK_VERIFIED_STATUS,
      };

    if (
      up.status === CLERK_MISSING_REQUIREMENTS_STATUS &&
      up.missingFields.length === NO_MISSING_FIELDS &&
      up.unverifiedFields.includes('email_address')
    )
      return {stage: 'verification'};

    return {stage: up.status === null ? 'credentials' : 'unsupported'};
  };

  const signinState = (): Attempt => {
    const signin = resources.signIn;

    if (signin.status === CLERK_COMPLETE_STATUS) return {stage: 'ready', verified: true};

    if (
      (signin.status === CLERK_CLIENT_TRUST_STATUS ||
        signin.status === CLERK_SECOND_FACTOR_STATUS) &&
      signin.supportedSecondFactors?.some((factor) => factor.strategy === CLERK_EMAIL_CODE_STRATEGY)
    )
      return {stage: 'verification'};

    return {stage: signin.status === null ? 'credentials' : 'unsupported'};
  };

  return {
    current: (mode) =>
      mode === AUTH_MODE.INVITATION
        ? {stage: 'credentials'}
        : mode === AUTH_MODE.SIGN_IN
          ? signinState()
          : signupState(),

    signup: async ({email, password}) => {
      await requireSuccess(resources.signUp.password({emailAddress: email, password}));

      return signupState();
    },

    signin: async ({email, password}) => {
      await requireSuccess(resources.signIn.password({emailAddress: email, password}));

      return signinState();
    },

    google: async (mode) => {
      if (mode === AUTH_MODE.INVITATION) throw new Error('Invitation authentication is deferred');

      const input = {
        strategy: 'oauth_google' as const,
        redirectUrl: '/organizations',
        redirectCallbackUrl: '/sso-callback',
      };

      await requireSuccess(
        mode === AUTH_MODE.SIGN_IN ? resources.signIn.sso(input) : resources.signUp.sso(input),
      );
    },

    invite: async (ticket, password) => {
      // create supports ticket + password atomically; recipient email is supplied by Clerk only.
      await requireSuccess(resources.signUp.create({strategy: 'ticket', ticket, password}));

      return signupState();
    },

    sendCode: async (mode) => {
      await requireSuccess(
        mode === AUTH_MODE.SIGN_IN
          ? resources.signIn.mfa.sendEmailCode()
          : resources.signUp.verifications.sendEmailCode(),
      );
    },

    verify: async (mode, code) => {
      await requireSuccess(
        mode === AUTH_MODE.SIGN_IN
          ? resources.signIn.mfa.verifyEmailCode({code})
          : resources.signUp.verifications.verifyEmailCode({code}),
      );

      return mode === AUTH_MODE.SIGN_IN ? signinState() : signupState();
    },

    activate: async (mode) => {
      const state = mode === AUTH_MODE.SIGN_IN ? signinState() : signupState();

      if (state.stage !== AUTH_STAGE.READY || !state.verified)
        throw new Error('Incomplete authentication');

      let destination = '/organizations';

      const navigate: NonNullable<
        Parameters<ClerkResources['signUp']['finalize']>[0]
      >['navigate'] = ({session, decorateUrl}) => {
        if (session?.currentTask && session.currentTask.key !== SESSION_TASK.CHOOSE_ORGANIZATION)
          throw new Error('Unsupported session task');

        destination = decorateUrl('/organizations');
      };

      await requireSuccess(
        mode === AUTH_MODE.SIGN_IN
          ? resources.signIn.finalize({navigate})
          : resources.signUp.finalize({navigate}),
      );

      return destination;
    },

    deactivate: () => resources.signOut(),
  };
}
