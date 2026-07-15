import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  const isDev = process.env.NODE_ENV === 'development';
  const corsOrigin = process.env.CORS_ORIGIN ?? (isDev ? 'http://localhost:3000' : null);
  if (!corsOrigin) {
    throw new Error('CORS_ORIGIN must be set in non-development environments');
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
  const host = isDev ? '0.0.0.0' : '127.0.0.1';
  await app.listen(port, host);
}

bootstrap();
