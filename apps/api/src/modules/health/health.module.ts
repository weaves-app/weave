import {Module} from '@nestjs/common';

import {DatabaseModule} from '../../infrastructure/database/database.module';
import {PrismaService} from '../../infrastructure/database/prisma.service';
import {HealthService} from './application/health.service';
import type {DatabaseHealth} from './application/health.service';
import {HealthController} from './health.controller';
import {APPLICATION_HEALTH, DATABASE_HEALTH} from './health.tokens';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [
    {
      provide: DATABASE_HEALTH,
      inject: [PrismaService],

      useFactory: (prisma: PrismaService): DatabaseHealth => ({
        ping: async () => {
          await prisma.$queryRaw`SELECT 1`;
        },
      }),
    },
    {
      provide: APPLICATION_HEALTH,
      inject: [DATABASE_HEALTH],

      useFactory: (database: DatabaseHealth) => new HealthService(database),
    },
  ],
})
export class HealthModule {}
