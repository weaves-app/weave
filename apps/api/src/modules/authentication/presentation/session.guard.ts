import {Inject, Injectable} from '@nestjs/common';
import type {CanActivate, ExecutionContext} from '@nestjs/common';

import type {
  AuthenticatedSession,
  SessionAuthenticator,
} from '../application/session-authenticator';
import {SESSION_AUTHENTICATOR} from '../application/session-authenticator';
import {AuthenticationFailure, AUTHENTICATION_FAILURE} from '../application/authentication-failure';

export const AUTHENTICATED_SESSION = Symbol('AuthenticatedSession');

export interface SessionRequest {
  readonly headers: {readonly authorization?: unknown};
  readonly body: unknown;
  readonly query?: unknown;
  [AUTHENTICATED_SESSION]?: AuthenticatedSession;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(SESSION_AUTHENTICATOR) private readonly authenticator: SessionAuthenticator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const header = request.headers.authorization;
    const match = typeof header === 'string' ? /^Bearer ([^\s,]+)$/i.exec(header) : null;
    const token = match?.[1];

    if (!token) throw new AuthenticationFailure({code: AUTHENTICATION_FAILURE.REQUIRED});

    request[AUTHENTICATED_SESSION] = await this.authenticator.authenticate(token);

    return true;
  }
}
