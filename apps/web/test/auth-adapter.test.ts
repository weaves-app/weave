import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createClerkGateway} from '../src/features/auth/infrastructure/clerk-gateway';
import type {ClerkResources} from '../src/features/auth/infrastructure/clerk-gateway';

function resources() {
  const calls: unknown[] = [];
  let signupStatus: ClerkResources['signUp']['status'] = 'missing_requirements';
  let signinStatus: ClerkResources['signIn']['status'] = 'needs_client_trust';
  const signUp: ClerkResources['signUp'] = {
    get status() {
      return signupStatus;
    },
    missingFields: [],
    unverifiedFields: ['email_address'],
    verifications: {
      emailAddress: {status: 'unverified'},
      sendEmailCode: async () => {
        calls.push('signup-code');
        return {error: null};
      },
      verifyEmailCode: async (input: unknown) => {
        calls.push(input);
        signupStatus = 'complete';
        signUp.verifications.emailAddress.status = 'verified';
        return {error: null};
      },
    } as ClerkResources['signUp']['verifications'],
    password: async (input) => {
      calls.push(input);
      return {error: null};
    },
    create: async (input) => {
      calls.push(input);
      signupStatus = 'complete';
      signUp.verifications.emailAddress.status = 'verified';
      return {error: null};
    },
    sso: async (input) => {
      calls.push(input);
      return {error: null};
    },
    finalize: async () => {
      calls.push('signup-finalize');
      return {error: null};
    },
  };
  const signIn: ClerkResources['signIn'] = {
    get status() {
      return signinStatus;
    },
    supportedSecondFactors: [
      {strategy: 'email_code', emailAddressId: 'id', safeIdentifier: 'p***@test'},
    ],
    mfa: {
      sendEmailCode: async () => {
        calls.push('signin-code');
        return {error: null};
      },
      verifyEmailCode: async (input: unknown) => {
        calls.push(input);
        signinStatus = 'complete';
        return {error: null};
      },
    } as ClerkResources['signIn']['mfa'],
    password: async (input) => {
      calls.push(input);
      return {error: null};
    },
    sso: async (input) => {
      calls.push(input);
      return {error: null};
    },
    finalize: async () => {
      calls.push('signin-finalize');
      return {error: null};
    },
  };
  const port: ClerkResources = {
    signUp,
    signIn,
    signOut: async () => {
      calls.push('signout');
    },
  };
  return {port, calls};
}
void test('WEA-10 S01 SDK adapter uses email/password then email verification before finalize', async () => {
  const {port, calls} = resources();
  const adapter = createClerkGateway(port);
  assert.equal(
    (await adapter.signup({email: 'p@test', password: 'password'})).stage,
    'verification',
  );
  await adapter.sendCode('signup');
  assert.equal((await adapter.verify('signup', 'code')).stage, 'ready');
  await adapter.activate('signup');
  assert.deepEqual(calls, [
    {emailAddress: 'p@test', password: 'password'},
    'signup-code',
    {code: 'code'},
    'signup-finalize',
  ]);
});
void test('WEA-10 S03 SDK invitation request contains ticket/password and no substitute email', async () => {
  const {port, calls} = resources();
  const adapter = createClerkGateway(port);
  assert.equal((await adapter.invite('opaque-ticket', 'password')).stage, 'ready');
  assert.deepEqual(calls[0], {strategy: 'ticket', ticket: 'opaque-ticket', password: 'password'});
  assert.equal(adapter.current('invitation').stage, 'credentials');
});
void test('WEA-10 S02/S07 SDK Device Trust and signout follow supported APIs', async () => {
  const {port, calls} = resources();
  const adapter = createClerkGateway(port);
  assert.equal(
    (await adapter.signin({email: 'p@test', password: 'password'})).stage,
    'verification',
  );
  await adapter.sendCode('signin');
  await adapter.verify('signin', 'code');
  await adapter.activate('signin');
  await adapter.deactivate();
  assert.deepEqual(calls, [
    {emailAddress: 'p@test', password: 'password'},
    'signin-code',
    {code: 'code'},
    'signin-finalize',
    'signout',
  ]);
});
void test('WEA-10 S08 SDK returned error is rejected, incomplete status cannot finalize', async () => {
  const {port} = resources();
  port.signUp.password = async () => ({
    error: Object.assign(new Error('provider'), {
      code: 'form_password_pwned',
      clerkError: true as const,
      longMessage: undefined,
      docsUrl: undefined,
      cause: undefined,
    }),
  });
  const adapter = createClerkGateway(port);
  await assert.rejects(() => adapter.signup({email: 'p@test', password: 'weak'}));
  await assert.rejects(() => adapter.activate('signup'));
});

void test('WEA-10 S11 Google adapter uses the supported SSO API and protected callback destinations', async () => {
  const {port, calls} = resources();
  const adapter = createClerkGateway(port);
  await adapter.google('signup');
  await adapter.google('signin');
  assert.deepEqual(calls, [
    {strategy: 'oauth_google', redirectUrl: '/organizations', redirectCallbackUrl: '/sso-callback'},
    {strategy: 'oauth_google', redirectUrl: '/organizations', redirectCallbackUrl: '/sso-callback'},
  ]);
  await assert.rejects(() => adapter.google('invitation'));
});
