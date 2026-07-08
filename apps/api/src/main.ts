import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  if (process.env.NODE_ENV === 'production' && !corsOrigin.startsWith('https://')) {
    throw new Error('CORS_ORIGIN must be a valid HTTPS URL in production');
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
  await app.listen(port);
}

bootstrap();
