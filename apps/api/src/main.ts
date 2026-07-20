import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  const isDev = process.env.NODE_ENV === 'development';
  const corsOrigin = process.env.CORS_ORIGIN;
  if (!corsOrigin) {
    throw new Error('CORS_ORIGIN must be set (set CORS_ORIGIN=http://localhost:3000 in .env for local dev)');
  }
  if (!isDev && !corsOrigin.startsWith('https://')) {
    throw new Error('CORS_ORIGIN must be a valid HTTPS URL in non-development environments');
  }
  app.enableCors({ origin: corsOrigin });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  const port = process.env.API_PORT ?? 3001;
  const host = '0.0.0.0';
  await app.listen(port, host);
}

bootstrap();
