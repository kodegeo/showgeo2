import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Internal server error";

    let message: string | string[] = "Internal server error";
    let error: string | undefined;

    if (typeof payload === "string") {
      message = payload;
    } else if (payload && typeof payload === "object") {
      const response = payload as {
        message?: string | string[];
        error?: string;
      };
      if (Array.isArray(response.message) || typeof response.message === "string") {
        message = response.message;
      } else if (exception instanceof HttpException) {
        message = exception.message || "Request failed";
      }
      if (typeof response.error === "string") {
        error = response.error;
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(error ? { error } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
