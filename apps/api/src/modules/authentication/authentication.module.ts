import {Module} from '@nestjs/common';
import {ConfigModule, ConfigService} from '@nestjs/config';

import {SESSION_AUTHENTICATOR} from './application/session-authenticator';
import type {SessionAuthenticator} from './application/session-authenticator';
import {AuthenticationFailure, AUTHENTICATION_FAILURE} from './application/authentication-failure';
import {ClerkSessionAuthenticator} from './infrastructure/clerk-session-authenticator';
import {SessionGuard} from './presentation/session.guard';

export const AUTH_CONFIG = {EMPTY: '', HTTPS: 'https:'} as const;

@Module({
  imports: [ConfigModule],
  providers: [
    SessionGuard,
    {
      provide: SESSION_AUTHENTICATOR,
      inject: [ConfigService],

      useFactory: (config: ConfigService): SessionAuthenticator => ({
        authenticate: async (bearer) => {
          const secretKey = config.get<string>('CLERK_SECRET_KEY');
          const publishableKey = config.get<string>('CLERK_PUBLISHABLE_KEY');
          const issuer = config.get<string>('CLERK_EXPECTED_ISSUER');
          const jwtKey = config.get<string>('CLERK_JWT_KEY');

          if (!secretKey || !publishableKey || !issuer || !jwtKey)
            throw new AuthenticationFailure({code: AUTHENTICATION_FAILURE.UNAVAILABLE});

          try {
            if (new URL(issuer).protocol !== AUTH_CONFIG.HTTPS) throw new Error();
          } catch {
            throw new AuthenticationFailure({code: AUTHENTICATION_FAILURE.UNAVAILABLE});
          }

          return new ClerkSessionAuthenticator({
            secretKey,
            publishableKey,
            issuer,
            jwtKey,
            allowedOrigins: (config.get<string>('CLERK_ALLOWED_ORIGINS') ?? AUTH_CONFIG.EMPTY)
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean),
            audience: config.get<string>('CLERK_AUDIENCE'),
          }).authenticate(bearer);
        },
      }),
    },
  ],
  exports: [SESSION_AUTHENTICATOR, SessionGuard],
})
export class AuthenticationModule {}
