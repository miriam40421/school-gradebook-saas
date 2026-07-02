import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : (body as { message?: string | string[] }).message ?? exception.message;
      const payload: Record<string, unknown> = {
        statusCode: status,
        message: Array.isArray(message) ? message.join(', ') : message,
        error: exception.name,
      };
      if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
        const obj = body as Record<string, unknown>;
        if (obj.lockedBy) payload.lockedBy = obj.lockedBy;
        if (obj.expiresAt) payload.expiresAt = obj.expiresAt;
        if (obj.code) payload.code = obj.code;
      }
      response.status(status).json(payload);
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error(exception);
    }
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'InternalServerError',
    });
  }
}
