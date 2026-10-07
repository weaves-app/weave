import {readAccess} from './policy';
import type {SessionGateway} from './policy';
export async function serveSession(gateway: SessionGateway): Promise<Response> {
  const access = await readAccess(gateway);
  return Response.json(
    {authenticated: access.status === 'authenticated'},
    {
      status: access.status === 'authenticated' ? 200 : access.status === 'unavailable' ? 503 : 401,
      headers: {'Cache-Control': 'no-store'},
    },
  );
}
