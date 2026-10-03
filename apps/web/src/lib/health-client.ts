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
      body.status === 'ok' &&
      'service' in body &&
      body.service === 'weave-api'
      ? 'Connected'
      : 'Unavailable';
  } catch {
    return 'Unavailable';
  }
}
