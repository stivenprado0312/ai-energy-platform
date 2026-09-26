import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../errors/domain.error';

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const body = this.buildBody(exception);
    response.status(body.statusCode).json(body);
  }

  private buildBody(exception: unknown): ErrorBody {
    if (exception instanceof DomainError) {
      return {
        statusCode: exception.httpStatus,
        code: exception.code,
        message: exception.message,
        ...('details' in exception && exception.details !== undefined
          ? { details: (exception as DomainError & { details?: unknown }).details }
          : {}),
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string' ? res : ((res as { message?: unknown }).message ?? exception.message);
      return {
        statusCode: status,
        code: this.codeForStatus(status),
        message: Array.isArray(message) ? 'Validation failed' : String(message),
        ...(Array.isArray(message) ? { details: message } : {}),
      };
    }

    this.logger.error('Unhandled exception', exception as Error);
    return {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    };
  }

  private codeForStatus(status: number): string {
    if (status === 404) return 'NOT_FOUND';
    if (status === 400) return 'BAD_REQUEST';
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 409) return 'CONFLICT';
    if (status === 422) return 'UNPROCESSABLE_ENTITY';
    return 'ERROR';
  }
}
