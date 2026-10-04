import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {ConfigService} from '@nestjs/config';
import {AppModule} from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api');
  app.enableCors({origin: config.get<string>('FRONTEND_URL', 'http://localhost:3000')});
  app.enableShutdownHooks();
  await app.listen(Number(config.get('PORT', 3001)));
}
void bootstrap();
