import type {SignInFutureResource, SignUpFutureResource} from '@clerk/nextjs/types';
import type {Attempt, AuthGateway} from '../application/contracts';
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
    if (up.status === 'complete')
      return {stage: 'ready', verified: up.verifications.emailAddress.status === 'verified'};
    if (
      up.status === 'missing_requirements' &&
      up.missingFields.length === 0 &&
      up.unverifiedFields.includes('email_address')
    )
      return {stage: 'verification'};
    return {stage: up.status === null ? 'credentials' : 'unsupported'};
  };
  const signinState = (): Attempt => {
    const signin = resources.signIn;
    if (signin.status === 'complete') return {stage: 'ready', verified: true};
    if (
      (signin.status === 'needs_client_trust' || signin.status === 'needs_second_factor') &&
      signin.supportedSecondFactors?.some((factor) => factor.strategy === 'email_code')
    )
      return {stage: 'verification'};
    return {stage: signin.status === null ? 'credentials' : 'unsupported'};
  };
  return {
    current: (mode) =>
      mode === 'invitation'
        ? {stage: 'credentials'}
        : mode === 'signin'
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
      if (mode === 'invitation') throw new Error('Invitation authentication is deferred');
      const input = {
        strategy: 'oauth_google' as const,
        redirectUrl: '/organizations',
        redirectCallbackUrl: '/sso-callback',
      };
      await requireSuccess(
        mode === 'signin' ? resources.signIn.sso(input) : resources.signUp.sso(input),
      );
    },
    invite: async (ticket, password) => {
      // create supports ticket + password atomically; recipient email is supplied by Clerk only.
      await requireSuccess(resources.signUp.create({strategy: 'ticket', ticket, password}));
      return signupState();
    },
    sendCode: async (mode) => {
      await requireSuccess(
        mode === 'signin'
          ? resources.signIn.mfa.sendEmailCode()
          : resources.signUp.verifications.sendEmailCode(),
      );
    },
    verify: async (mode, code) => {
      await requireSuccess(
        mode === 'signin'
          ? resources.signIn.mfa.verifyEmailCode({code})
          : resources.signUp.verifications.verifyEmailCode({code}),
      );
      return mode === 'signin' ? signinState() : signupState();
    },
    activate: async (mode) => {
      const state = mode === 'signin' ? signinState() : signupState();
      if (state.stage !== 'ready' || !state.verified) throw new Error('Incomplete authentication');
      let destination = '/organizations';
      const navigate: NonNullable<
        Parameters<ClerkResources['signUp']['finalize']>[0]
      >['navigate'] = ({session, decorateUrl}) => {
        if (session?.currentTask && session.currentTask.key !== 'choose-organization')
          throw new Error('Unsupported session task');
        destination = decorateUrl('/organizations');
      };
      await requireSuccess(
        mode === 'signin'
          ? resources.signIn.finalize({navigate})
          : resources.signUp.finalize({navigate}),
      );
      return destination;
    },
    deactivate: () => resources.signOut(),
  };
}
