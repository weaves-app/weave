import {Controller, Get, Inject, ServiceUnavailableException} from '@nestjs/common';

import type {ApplicationHealth} from './application/health.service';
import {APPLICATION_HEALTH} from './health.tokens';

@Controller('health')
export class HealthController {
  constructor(@Inject(APPLICATION_HEALTH) private readonly healthService: ApplicationHealth) {}

  @Get() health(): ReturnType<ApplicationHealth['live']> {
    return this.healthService.live();
  }

  @Get('ready') async ready(): Promise<Awaited<ReturnType<ApplicationHealth['ready']>>> {
    try {
      return await this.healthService.ready();
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }
}
