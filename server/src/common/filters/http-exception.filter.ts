import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const exceptionResponse = exception.getResponse();
    let status = exception.getStatus();

    let message =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).message || exception.message
        : exceptionResponse || exception.message;

    let validationData: Record<string, string> | null = null;

    // Detect NestJS ValidationPipe errors (status 400 + array of messages)
    if (status === HttpStatus.BAD_REQUEST && Array.isArray(message)) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      const data: Record<string, string> = {};

      message.forEach((msg: string) => {
        // NestJS ValidationPipe messages often start with the property name
        const field = msg.split(' ')[0];
        if (field && !data[field]) {
          data[field] = msg;
        }
      });

      validationData = data;
      message = 'Dữ liệu nhập vào không hợp lệ';
    }

    const finalMessage = Array.isArray(message) ? message[0] : message;

    const errorResponse: any = {
      statusCode: status,
      message: finalMessage,
    };

    if (validationData) {
      errorResponse.data = validationData;
    }

    // Context for debugging
    const isProduction = process.env.NODE_ENV === 'production';
    const user = (request as any).user;
    const isAdmin = user && user.role === 'admin';

    // Only add debugging info if user is admin OR we are not in production
    if (isAdmin || !isProduction) {
      errorResponse.timestamp = new Date().toISOString();
      errorResponse.path = request.url;
      if (status === 500) {
        errorResponse.debug =
          exception.message || (exceptionResponse as any).message;
      }
    }

    response.status(status).json(errorResponse);
  }
}
