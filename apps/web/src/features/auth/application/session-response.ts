import {readAccess} from './policy';
import type {SessionGateway} from './policy';

import {ACCESS_STATUS} from './auth-constants';

export async function serveSession(gateway: SessionGateway): Promise<Response> {
  const access = await readAccess(gateway);

  return Response.json(
    {authenticated: access.status === ACCESS_STATUS.AUTHENTICATED},
    {
      status:
        access.status === ACCESS_STATUS.AUTHENTICATED
          ? 200
          : access.status === ACCESS_STATUS.UNAVAILABLE
            ? 503
            : 401,
      headers: {'Cache-Control': 'no-store'},
    },
  );
}
