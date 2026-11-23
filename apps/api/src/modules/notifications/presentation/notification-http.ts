import {Catch} from '@nestjs/common';
import type {ArgumentsHost, ExceptionFilter} from '@nestjs/common';
import type {NestExpressApplication} from '@nestjs/platform-express';
import type {IncomingMessage} from 'node:http';

import {NotificationFailure, NOTIFICATION_ERROR} from '../application/notification-failure';
import {AuthenticationFailure, AUTHENTICATION_FAILURE} from '../../authentication/contracts';

export interface BoundaryResponse {
  setHeader(name: string, value: string): void;
  status(code: number): BoundaryResponse;
  json(body: unknown): void;
}

export interface BoundaryRequest extends IncomingMessage {
  readonly originalUrl?: string;
}

export const HTTP_STATUS = {
  OK: 200,
  INVALID: 400,
  UNAUTHORIZED: 401,
  LARGE: 413,
  RETRY: 429,
  UNAVAILABLE: 503,
} as const;

export const HTTP_LIMIT = {
  BYTES: 4096,
  MIN_RETRY: 1,
  MAX_RETRY: 60,
  PREFIX: '/api/notifications',
  EMPTY: '',
} as const;

function sendFailure(error: unknown, response: BoundaryResponse): void {
  let status: number = HTTP_STATUS.UNAVAILABLE;
  let code: string = NOTIFICATION_ERROR.UNAVAILABLE;
  let retryAfterSeconds: number | undefined;

  if (error instanceof AuthenticationFailure && error.code === AUTHENTICATION_FAILURE.REQUIRED) {
    status = HTTP_STATUS.UNAUTHORIZED;
    code = AUTHENTICATION_FAILURE.REQUIRED;
  }

  if (error instanceof NotificationFailure) {
    code = error.code;

    if (code === NOTIFICATION_ERROR.INVALID) status = HTTP_STATUS.INVALID;

    if (code === NOTIFICATION_ERROR.TOO_LARGE) status = HTTP_STATUS.LARGE;

    if (code === NOTIFICATION_ERROR.RETRY) status = HTTP_STATUS.RETRY;

    if (error.retryAfterSeconds !== undefined && Number.isFinite(error.retryAfterSeconds))
      retryAfterSeconds = Math.max(
        HTTP_LIMIT.MIN_RETRY,
        Math.min(HTTP_LIMIT.MAX_RETRY, Math.ceil(error.retryAfterSeconds)),
      );
  }

  response.setHeader('Cache-Control', 'no-store');

  if (retryAfterSeconds !== undefined) response.setHeader('Retry-After', String(retryAfterSeconds));

  response
    .status(status)
    .json(retryAfterSeconds === undefined ? {code} : {code, retryAfterSeconds});
}

@Catch()
export class NotificationExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    sendFailure(error, host.switchToHttp().getResponse<BoundaryResponse>());
  }
}

export function configureNotificationHttp(app: NestExpressApplication): void {
  app.use(
    (request: BoundaryRequest, response: BoundaryResponse, next: (error?: unknown) => void) => {
      if (!(request.originalUrl ?? HTTP_LIMIT.EMPTY).startsWith(HTTP_LIMIT.PREFIX)) {
        next();

        return;
      }

      response.setHeader('Cache-Control', 'no-store');

      if (
        !/^application\/json(?:\s*;.*)?$/i.test(request.headers['content-type'] ?? HTTP_LIMIT.EMPTY)
      ) {
        sendFailure(new NotificationFailure({code: NOTIFICATION_ERROR.INVALID}), response);

        return;
      }

      next();
    },
  );
  app.useBodyParser('json', {limit: HTTP_LIMIT.BYTES, strict: true});
  app.use(
    (
      error: unknown,
      _request: BoundaryRequest,
      response: BoundaryResponse,
      _next: (error?: unknown) => void,
    ) => {
      void _next; // Express recognizes error middleware by its four-argument signature.

      const oversized =
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        error.status === HTTP_STATUS.LARGE;

      sendFailure(
        new NotificationFailure({
          code: oversized ? NOTIFICATION_ERROR.TOO_LARGE : NOTIFICATION_ERROR.INVALID,
        }),
        response,
      );
    },
  );
}
