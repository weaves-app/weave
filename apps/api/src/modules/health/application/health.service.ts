export interface DatabaseHealth {
  ping(): Promise<void>;
}
export interface ApplicationHealth {
  live(): {status: 'ok'; service: string};
  ready(): Promise<{status: 'ok'; database: 'connected'}>;
}
export class HealthService implements ApplicationHealth {
  constructor(private readonly database: DatabaseHealth) {}
  live(): {status: 'ok'; service: string} {
    return {status: 'ok', service: 'weave-api'};
  }
  async ready(): Promise<{status: 'ok'; database: 'connected'}> {
    await this.database.ping();
    return {status: 'ok', database: 'connected'};
  }
}
