export interface AuthenticatedSession {
  readonly accountId: string;
  readonly sessionId: string;
  readonly tokenExpiresAtSeconds: number;
}

export interface SessionAuthenticator {
  authenticate(bearer: string): Promise<AuthenticatedSession>;
}

export const SESSION_AUTHENTICATOR = Symbol('SessionAuthenticator');
