import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { Response } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ErrorLog, ErrorLogDocument } from '../schemas/error-log.schema';

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(
    @InjectModel(ErrorLog.name)
    private readonly errorLogModel: Model<ErrorLogDocument>,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // If the response was already sent (e.g., redirect), avoid writing headers again
    if (response.headersSent) {
      return;
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        errors = (exceptionResponse as any).errors || null;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log the error (console)
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Message: ${message}`,
      exception instanceof Error ? exception.stack : '',
    );

    // Persist error to database (best-effort, non-blocking)
    this.errorLogModel
      .create({
        level: 'error',
        message,
        stack: exception instanceof Error ? exception.stack : undefined,
        status,
        method: request.method,
        url: request.url,
        meta: {
          user: request.user?.id || request.user?._id || null,
          body: request.body,
          params: request.params,
          query: request.query,
        },
      })
      .catch((err: Error) => {
        this.logger.error('Failed to persist error log', err.stack);
      });

    // Send standardized response
    response.status(status).json({
      success: false,
      message,
      data: errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
