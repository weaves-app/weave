import assert from 'node:assert/strict';
import type {SessionResource} from '@clerk/nextjs/types';
import {test} from 'node:test';
import {createOAuthGateway} from '../src/features/auth/infrastructure/clerk-oauth';
import type {OAuthResources} from '../src/features/auth/infrastructure/clerk-oauth';
import {createLiveResources} from '../src/features/auth/infrastructure/live-resources';
function fixture() {
  let activations = 0;
  const finalize: OAuthResources['signUp']['finalize'] = async (options) => {
    activations++;
    await options?.navigate?.({
      session: {currentTask: undefined} as SessionResource,
      decorateUrl: (url) => url,
    });
    return {error: null};
  };
  const initial: OAuthResources = {
    signedIn: false,
    signIn: {
      status: 'needs_identifier',
      isTransferable: false,
      existingSession: undefined,
      create: async () => ({error: null}),
      finalize,
    },
    signUp: {
      status: 'missing_requirements',
      isTransferable: false,
      existingSession: undefined,
      missingFields: [],
      unverifiedFields: [],
      create: async () => ({error: null}),
      finalize,
    },
    activateExisting: async (_id, navigate) => {
      activations++;
      await navigate?.({
        session: {currentTask: undefined} as SessionResource,
        decorateUrl: (url) => url,
      });
    },
  };
  const live = createLiveResources(initial);
  const gateway = createOAuthGateway({
    get signIn() {
      return live.current.signIn;
    },
    get signUp() {
      return live.current.signUp;
    },
    get signedIn() {
      return live.current.signedIn;
    },
    get pendingTask() {
      return live.current.pendingTask;
    },
    activateExisting: (id, navigate) => live.current.activateExisting(id, navigate),
  });
  return {initial, live, gateway, activations: () => activations};
}
void test('WEA-10 S11 unresolved callback refuses activation; completed callback finalizes only once', async () => {
  const unresolved = fixture();
  assert.match((await unresolved.gateway.finish()).error ?? '', /try again/i);
  assert.equal(unresolved.activations(), 0);
  const ready = fixture();
  ready.live.update({...ready.initial, signUp: {...ready.initial.signUp, status: 'complete'}});
  assert.deepEqual(await ready.gateway.finish(), {destination: '/organizations'});
  assert.deepEqual(await ready.gateway.finish(), {destination: '/organizations'});
  assert.equal(ready.activations(), 1);
});
void test('WEA-10 S11 transfer reads current SDK snapshot after awaited create', async () => {
  const f = fixture();
  f.live.update({
    ...f.initial,
    signUp: {...f.initial.signUp, isTransferable: true},
    signIn: {
      ...f.initial.signIn,
      create: async () => {
        f.live.update({...f.live.current, signIn: {...f.initial.signIn, status: 'complete'}});
        return {error: null};
      },
    },
  });
  assert.deepEqual(await f.gateway.finish(), {destination: '/organizations'});
  assert.equal(f.activations(), 1);
});
void test('WEA-10 S11 extra fields and verification direct users to actual requirements, never Home', async () => {
  const fields = fixture();
  fields.live.update({
    ...fields.initial,
    signUp: {...fields.initial.signUp, missingFields: ['first_name']},
  });
  assert.match((await fields.gateway.finish()).error ?? '', /first name/);
  assert.equal(fields.activations(), 0);
  const email = fixture();
  email.live.update({
    ...email.initial,
    signUp: {...email.initial.signUp, unverifiedFields: ['email_address']},
  });
  assert.deepEqual(await email.gateway.finish(), {destination: '/sign-up'});
  assert.equal(email.activations(), 0);
  const trust = fixture();
  trust.live.update({
    ...trust.initial,
    signIn: {...trust.initial.signIn, status: 'needs_client_trust'},
  });
  assert.deepEqual(await trust.gateway.finish(), {destination: '/sign-in'});
});
void test('WEA-10 S11 returned finalize errors cannot report Home success', async () => {
  const f = fixture();
  f.live.update({
    ...f.initial,
    signUp: {
      ...f.initial.signUp,
      status: 'complete',
      finalize: async () => ({
        error: Object.assign(new Error('provider'), {
          code: 'network',
          clerkError: true as const,
          longMessage: undefined,
          docsUrl: undefined,
          cause: undefined,
        }),
      }),
    },
  });
  await assert.rejects(() => f.gateway.finish());
});

void test('WEA-10 S11 pending organization session explains the blocker and never navigates Home', async () => {
  const f = fixture();
  f.live.update({...f.initial, signedIn: false, pendingTask: 'choose-organization'});
  assert.deepEqual(await f.gateway.finish(), {destination: '/organizations'});
  assert.equal(f.activations(), 0);
});
