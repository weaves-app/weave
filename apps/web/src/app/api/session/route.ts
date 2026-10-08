import {serveSession} from '../../../features/auth/application/session-response';
import {serverSessionGateway} from '../../../features/auth/infrastructure/server-session';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return serveSession(serverSessionGateway());
}
