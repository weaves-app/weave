import {Controller, Post, Inject, Req, HttpCode, UseFilters, UseGuards} from '@nestjs/common';

import type {
  NotificationServices,
  IdentityGrant,
  ReadinessResult,
} from '../application/notification-ports';
import type {SessionRequest, AuthenticatedSession} from '../../authentication/contracts';
import {
  SessionGuard,
  AUTHENTICATED_SESSION,
  AuthenticationFailure,
  AUTHENTICATION_FAILURE,
} from '../../authentication/contracts';
import {NOTIFICATION_SERVICES} from '../notifications.tokens';
import {emptyGrant, readinessInput} from './notification-input';
import {NotificationExceptionFilter, HTTP_STATUS} from './notification-http';

function session(request: SessionRequest): AuthenticatedSession {
  const value = request[AUTHENTICATED_SESSION];

  if (!value) throw new AuthenticationFailure({code: AUTHENTICATION_FAILURE.REQUIRED});

  return value;
}

@Controller('notifications')
@UseFilters(NotificationExceptionFilter)
@UseGuards(SessionGuard)
export class NotificationsController {
  constructor(@Inject(NOTIFICATION_SERVICES) private readonly services: NotificationServices) {}

  @Post('identity-grant')
  @HttpCode(HTTP_STATUS.OK)
  grant(@Req() request: SessionRequest): Promise<IdentityGrant> {
    emptyGrant(request.body, request.query);

    return this.services.issuer.execute(session(request));
  }

  @Post('readiness')
  @HttpCode(HTTP_STATUS.OK)
  readiness(@Req() request: SessionRequest): Promise<ReadinessResult> {
    return this.services.verifier.execute(
      session(request),
      readinessInput(request.body, request.query),
    );
  }
}
