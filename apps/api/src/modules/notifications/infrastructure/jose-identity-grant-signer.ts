import type {AuthenticatedSession} from '../../authentication/contracts';
import type {Clock, IdentityGrant, IdentityGrantSigner} from '../application/notification-ports';
import {NotificationFailure, NOTIFICATION_ERROR} from '../application/notification-failure';

export interface SigningConfig {
  readonly appId: string;
  readonly privateKey: string;
}

export const SIGNING = {
  SECOND_MS: 1000,
  MINIMUM_SECONDS: 15,
  MAXIMUM_SECONDS: 300,
  RETRY_SECONDS: 5,
  ALGORITHM: 'ES256',
} as const;

export class JoseIdentityGrantSigner implements IdentityGrantSigner {
  constructor(
    private readonly config: SigningConfig,
    private readonly clock: Clock,
  ) {}

  async sign(session: AuthenticatedSession): Promise<IdentityGrant> {
    try {
      const {importPKCS8, SignJWT} = await import('jose');
      const key = await importPKCS8(this.config.privateKey, SIGNING.ALGORITHM);
      const now = Math.floor(this.clock.now() / SIGNING.SECOND_MS);

      if (session.tokenExpiresAtSeconds - now < SIGNING.MINIMUM_SECONDS)
        throw new NotificationFailure({
          code: NOTIFICATION_ERROR.UNAVAILABLE,
          retryAfterSeconds: SIGNING.RETRY_SECONDS,
        });

      const exp = Math.min(session.tokenExpiresAtSeconds, now + SIGNING.MAXIMUM_SECONDS);
      const token = await new SignJWT({identity: {external_id: session.accountId}})
        .setProtectedHeader({alg: SIGNING.ALGORITHM})
        .setIssuer(this.config.appId)
        .setExpirationTime(exp)
        .sign(key);

      return {
        externalId: session.accountId,
        token,
        expiresAt: new Date(exp * SIGNING.SECOND_MS).toISOString(),
      };
    } catch (error) {
      if (error instanceof NotificationFailure) throw error;

      throw new NotificationFailure({code: NOTIFICATION_ERROR.UNAVAILABLE});
    }
  }
}
