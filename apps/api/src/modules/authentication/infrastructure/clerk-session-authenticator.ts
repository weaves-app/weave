import {createClerkClient} from '@clerk/backend';

import type {
  AuthenticatedSession,
  SessionAuthenticator,
} from '../application/session-authenticator';
import {AuthenticationFailure, AUTHENTICATION_FAILURE} from '../application/authentication-failure';

export interface ClerkAuthenticationConfig {
  readonly secretKey: string;
  readonly publishableKey: string;
  readonly issuer: string;
  readonly allowedOrigins: readonly string[];
  readonly audience?: string;
  readonly jwtKey?: string;
}

export const CLERK_POLICY = {
  ACTIVE: 'active',
  EMPTY: '',
  ZERO: 0,
  SECOND_MS: 1000,
  NOT_FOUND: 404,
  TIMEOUT_MS: 5000,
  SESSION_TOKEN: 'session_token',
  URL: 'https://weave.invalid/notifications',
} as const;

export const INVALID_TOKEN_REASONS = new Set([
  'token-expired',
  'session-token-expired',
  'token-invalid',
  'token-invalid-algorithm',
  'token-invalid-authorized-parties',
  'token-invalid-signature',
  'token-not-active-yet',
  'session-token-nbf',
  'token-iat-in-the-future',
  'session-token-iat-in-the-future',
  'token-verification-failed',
  'token-type-mismatch',
  'jwk-kid-mismatch',
]);

export class ClerkSessionAuthenticator implements SessionAuthenticator {
  constructor(private readonly config: ClerkAuthenticationConfig) {}

  async authenticate(bearer: string): Promise<AuthenticatedSession> {
    try {
      if (!this.config.jwtKey)
        throw new AuthenticationFailure({code: AUTHENTICATION_FAILURE.UNAVAILABLE});

      const client = createClerkClient({...this.config, telemetry: {disabled: true}});
      const state = await client.authenticateRequest(
        new Request(CLERK_POLICY.URL, {
          method: 'POST',
          headers: {authorization: `Bearer ${bearer}`},
        }),
        {acceptsToken: CLERK_POLICY.SESSION_TOKEN, clockSkewInMs: CLERK_POLICY.ZERO},
      );

      if (!state.isAuthenticated)
        throw new AuthenticationFailure({
          code:
            INVALID_TOKEN_REASONS.has(state.reason ?? CLERK_POLICY.EMPTY) ||
            state.reason?.startsWith('session-token-expired-refresh-')
              ? AUTHENTICATION_FAILURE.REQUIRED
              : AUTHENTICATION_FAILURE.UNAVAILABLE,
        });

      const auth = state.toAuth();
      const claims = auth.sessionClaims;

      if (
        !claims ||
        typeof auth.userId !== 'string' ||
        !auth.userId.trim() ||
        typeof auth.sessionId !== 'string' ||
        !auth.sessionId.trim() ||
        claims.iss !== this.config.issuer ||
        (claims.sts !== undefined && claims.sts !== CLERK_POLICY.ACTIVE) ||
        (claims.azp !== undefined &&
          (typeof claims.azp !== 'string' || !this.config.allowedOrigins.includes(claims.azp))) ||
        !Number.isSafeInteger(claims.exp) ||
        claims.exp <= Math.floor(Date.now() / CLERK_POLICY.SECOND_MS)
      )
        throw new AuthenticationFailure({code: AUTHENTICATION_FAILURE.REQUIRED});

      if (
        this.config.audience &&
        !(
          claims.aud === this.config.audience ||
          (Array.isArray(claims.aud) &&
            claims.aud.every((value: unknown) => typeof value === 'string') &&
            claims.aud.includes(this.config.audience))
        )
      )
        throw new AuthenticationFailure({code: AUTHENTICATION_FAILURE.REQUIRED});

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CLERK_POLICY.TIMEOUT_MS);

      try {
        const response = await fetch(
          `https://api.clerk.com/v1/sessions/${encodeURIComponent(auth.sessionId)}`,
          {
            headers: {authorization: `Bearer ${this.config.secretKey}`, accept: 'application/json'},
            signal: controller.signal,
            redirect: 'error',
          },
        );

        if (response.status === CLERK_POLICY.NOT_FOUND)
          throw new AuthenticationFailure({code: AUTHENTICATION_FAILURE.REQUIRED});

        if (!response.ok)
          throw new AuthenticationFailure({code: AUTHENTICATION_FAILURE.UNAVAILABLE});

        const live: unknown = await response.json();

        if (
          typeof live !== 'object' ||
          live === null ||
          !('id' in live) ||
          !('user_id' in live) ||
          !('status' in live) ||
          typeof live.id !== 'string' ||
          typeof live.user_id !== 'string' ||
          typeof live.status !== 'string'
        )
          throw new AuthenticationFailure({code: AUTHENTICATION_FAILURE.UNAVAILABLE});

        if (
          live.id !== auth.sessionId ||
          live.user_id !== auth.userId ||
          live.status !== CLERK_POLICY.ACTIVE
        )
          throw new AuthenticationFailure({code: AUTHENTICATION_FAILURE.REQUIRED});
      } finally {
        clearTimeout(timer);
      }

      return {accountId: auth.userId, sessionId: auth.sessionId, tokenExpiresAtSeconds: claims.exp};
    } catch (error) {
      if (error instanceof AuthenticationFailure) throw error;

      throw new AuthenticationFailure({code: AUTHENTICATION_FAILURE.UNAVAILABLE});
    }
  }
}
