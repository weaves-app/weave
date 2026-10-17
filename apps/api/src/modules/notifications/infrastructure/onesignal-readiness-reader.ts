import type {AuthenticatedSession} from '../../authentication/contracts';
import type {
  IdentityGrantSigner,
  ProviderReadinessReader,
  ReadinessQuery,
  RequestBudget,
  Clock,
} from '../application/notification-ports';
import {PUSH_PLATFORM} from '../application/notification-ports';
import {NotificationFailure, NOTIFICATION_ERROR} from '../application/notification-failure';

export interface ProviderHttp {
  fetch(url: string, init: RequestInit): Promise<Response>;
}

export const PROVIDER_POLICY = {
  BASE: 'https://api.onesignal.com',
  ANDROID: 'AndroidPush',
  IOS: 'iOSPush',
  MAX_BYTES: 1048576,
  TIMEOUT_MS: 5000,
  SECOND_MS: 1000,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  MIN_RETRY: 1,
  MAX_RETRY: 60,
  ZERO: 0,
  EMPTY: '',
} as const;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function boundedText(response: Response): Promise<string> {
  const reader = response.body?.getReader();

  if (!reader) throw new NotificationFailure({code: NOTIFICATION_ERROR.UNAVAILABLE});

  const parts: Uint8Array[] = [];
  let size = PROVIDER_POLICY.ZERO;

  try {
    for (;;) {
      const {done, value} = await reader.read();

      if (done) break;

      size += value.byteLength;

      if (size > PROVIDER_POLICY.MAX_BYTES)
        throw new NotificationFailure({code: NOTIFICATION_ERROR.UNAVAILABLE});

      parts.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  return Buffer.concat(parts).toString('utf8');
}

function matches(body: unknown, account: string, app: string, query: ReadinessQuery): boolean {
  if (
    !isRecord(body) ||
    !isRecord(body.identity) ||
    typeof body.identity.external_id !== 'string' ||
    !Array.isArray(body.subscriptions)
  )
    throw new NotificationFailure({code: NOTIFICATION_ERROR.UNAVAILABLE});

  if (body.app_id !== undefined && typeof body.app_id !== 'string')
    throw new NotificationFailure({code: NOTIFICATION_ERROR.UNAVAILABLE});

  const subscriptions = body.subscriptions.map((entry: unknown) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== 'string' ||
      typeof entry.type !== 'string' ||
      typeof entry.enabled !== 'boolean' ||
      typeof entry.token !== 'string' ||
      (entry.app_id !== undefined && typeof entry.app_id !== 'string')
    )
      throw new NotificationFailure({code: NOTIFICATION_ERROR.UNAVAILABLE});

    return entry;
  });

  if (body.identity.external_id !== account || (body.app_id !== undefined && body.app_id !== app))
    return false;

  return subscriptions.some(
    (entry) =>
      entry.id === query.subscriptionId &&
      entry.type ===
        (query.platform === PUSH_PLATFORM.ANDROID
          ? PROVIDER_POLICY.ANDROID
          : PROVIDER_POLICY.IOS) &&
      entry.enabled === true &&
      typeof entry.token === 'string' &&
      Boolean(entry.token.trim()) &&
      (entry.app_id === undefined || entry.app_id === app),
  );
}

export class OneSignalReadinessReader implements ProviderReadinessReader {
  constructor(
    private readonly appId: string,
    private readonly signer: IdentityGrantSigner,
    private readonly budget: RequestBudget,
    private readonly http: ProviderHttp,
    private readonly clock: Clock,
  ) {}

  async read(session: AuthenticatedSession, query: ReadinessQuery): Promise<boolean> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      const grant = await this.signer.sign(session);
      const key = `app:${this.appId}:provider`;

      await this.budget.reserve(key, PROVIDER_POLICY.SECOND_MS, false);
      timer = setTimeout(() => controller.abort(), PROVIDER_POLICY.TIMEOUT_MS);

      const response = await this.http.fetch(
        `${PROVIDER_POLICY.BASE}/apps/${encodeURIComponent(this.appId)}/users/by/external_id/${encodeURIComponent(session.accountId)}`,
        {
          method: 'GET',
          headers: {authorization: `Bearer ${grant.token}`, accept: 'application/json'},
          signal: controller.signal,
          redirect: 'error',
        },
      );

      if (!response.ok) void response.body?.cancel().catch(() => undefined);

      if (response.status === PROVIDER_POLICY.NOT_FOUND) return false;

      if (response.status === PROVIDER_POLICY.RATE_LIMITED) {
        const raw = response.headers.get('retry-after');
        const numeric = raw === null ? NaN : Number(raw);
        const milliseconds = Number.isFinite(numeric)
          ? numeric * PROVIDER_POLICY.SECOND_MS
          : Date.parse(raw ?? PROVIDER_POLICY.EMPTY) - this.clock.now();
        const delay = Number.isFinite(milliseconds)
          ? Math.max(PROVIDER_POLICY.SECOND_MS, milliseconds)
          : PROVIDER_POLICY.SECOND_MS;

        await this.budget.defer(key, delay, false);

        throw new NotificationFailure({
          code: NOTIFICATION_ERROR.RETRY,
          retryAfterSeconds: Math.min(
            PROVIDER_POLICY.MAX_RETRY,
            Math.max(PROVIDER_POLICY.MIN_RETRY, Math.ceil(delay / PROVIDER_POLICY.SECOND_MS)),
          ),
        });
      }

      if (!response.ok) throw new NotificationFailure({code: NOTIFICATION_ERROR.UNAVAILABLE});

      const body: unknown = JSON.parse(await boundedText(response));

      return matches(body, session.accountId, this.appId, query);
    } catch (error) {
      if (error instanceof NotificationFailure) throw error;

      throw new NotificationFailure({code: NOTIFICATION_ERROR.UNAVAILABLE});
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
