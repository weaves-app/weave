import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';

import {DatabaseModule} from './infrastructure/database/database.module';
import {NotificationsModule} from './modules/notifications/notifications.module';
import {HealthModule} from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true}),
    DatabaseModule,
    HealthModule,
    NotificationsModule,
  ],
})
export class AppModule {}
