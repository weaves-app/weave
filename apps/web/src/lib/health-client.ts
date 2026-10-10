export const HEALTHY_STATUS = 'ok';

export const API_SERVICE_NAME = 'weave-api';

export interface HealthTransport {
  get(url: string): Promise<{ok: boolean; json(): Promise<unknown>}>;
}

export async function readHealth(
  transport: HealthTransport,
  url: string,
): Promise<'Connected' | 'Unavailable'> {
  try {
    const response = await transport.get(url);

    if (!response.ok) return 'Unavailable';

    const body = await response.json();

    return typeof body === 'object' &&
      body !== null &&
      'status' in body &&
      body.status === HEALTHY_STATUS &&
      'service' in body &&
      body.service === API_SERVICE_NAME
      ? 'Connected'
      : 'Unavailable';
  } catch {
    return 'Unavailable';
  }
}
