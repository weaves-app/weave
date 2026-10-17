import type {ReadinessQuery} from '../application/notification-ports';
import {PUSH_PLATFORM} from '../application/notification-ports';
import {NotificationFailure, NOTIFICATION_ERROR} from '../application/notification-failure';

export const INPUT_LIMIT = {EMPTY: 0, READINESS_FIELDS: 2} as const;

function record(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input))
    throw new NotificationFailure({code: NOTIFICATION_ERROR.INVALID});

  return input as Record<string, unknown>;
}

export function emptyGrant(input: unknown, query: unknown): void {
  if (Object.keys(record(input)).length !== INPUT_LIMIT.EMPTY)
    throw new NotificationFailure({code: NOTIFICATION_ERROR.INVALID});

  emptyQuery(query);
}

export function emptyQuery(query: unknown): void {
  if (query !== undefined && Object.keys(record(query)).length !== INPUT_LIMIT.EMPTY)
    throw new NotificationFailure({code: NOTIFICATION_ERROR.INVALID});
}

export function readinessInput(input: unknown, query: unknown): ReadinessQuery {
  emptyQuery(query);

  const body = record(input);

  if (
    Object.keys(body).length !== INPUT_LIMIT.READINESS_FIELDS ||
    typeof body.subscriptionId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(body.subscriptionId) ||
    (body.platform !== PUSH_PLATFORM.ANDROID && body.platform !== PUSH_PLATFORM.IOS)
  )
    throw new NotificationFailure({code: NOTIFICATION_ERROR.INVALID});

  return {subscriptionId: body.subscriptionId, platform: body.platform};
}
