import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * HTTP exceptions (400, 404, 409, ...) are returned unchanged. Any other error
 * is logged with its stack trace and answered with a generic 500, so internal
 * details (SQL, driver messages) never reach the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const fields = (
        typeof body === 'string' ? { message: body } : body
      ) as Record<string, unknown>;

      // Same fields as the NestJS default, ordered with the status code first.
      response.status(status).json({
        statusCode: status,
        error: fields.error,
        message: fields.message,
        ...fields,
      });
      return;
    }

    this.logger.error(
      `Unhandled error on ${request.method} ${request.originalUrl}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
}
