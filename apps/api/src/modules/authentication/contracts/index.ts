export type {
  AuthenticatedSession,
  SessionAuthenticator,
} from '../application/session-authenticator';

export {SESSION_AUTHENTICATOR} from '../application/session-authenticator';

export {AuthenticationFailure, AUTHENTICATION_FAILURE} from '../application/authentication-failure';

export {SessionGuard, AUTHENTICATED_SESSION} from '../presentation/session.guard';

export type {SessionRequest} from '../presentation/session.guard';

export {AuthenticationModule} from '../authentication.module';
