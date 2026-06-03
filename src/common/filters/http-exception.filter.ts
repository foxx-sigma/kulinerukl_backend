import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: any = 'Internal server error';
    let errorDetails: any = null;
    
    if (exception instanceof HttpException) {
      const responseData = exception.getResponse();
      message = typeof responseData === 'object' ? (responseData as any).message || responseData : responseData;
      errorDetails = typeof responseData === 'object' ? (responseData as any).error : null;
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = exception.name;
    }

    // Selalu log error 500 ke terminal agar mudah di-debug
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: errorDetails || 'Internal Server Error',
      message: message,
    });
  }
}
