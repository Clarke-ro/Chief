import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type ErrorBody = {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
  requestId?: string;
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly isProduction = false) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message: string | string[] = 'Internal server error';
    let error = HttpStatus[status] ?? 'Error';

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const body = exceptionResponse as {
        message?: string | string[];
        error?: string;
      };
      message = body.message ?? message;
      error = body.error ?? error;
    } else if (exception instanceof Error && !this.isProduction) {
      message = exception.message;
    }

    // Keep intentional 503 messages (LLM quota / model unavailable) for the client.
    if (this.isProduction && status >= 500 && status !== HttpStatus.SERVICE_UNAVAILABLE) {
      message = 'Internal server error';
    }

    const body: ErrorBody = {
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: request.id,
    };

    if (status >= 500) {
      this.logger.error(
        {
          err: exception,
          path: request.url,
          requestId: request.id,
        },
        'Unhandled exception',
      );
    }

    response.status(status).json(body);
  }
}
