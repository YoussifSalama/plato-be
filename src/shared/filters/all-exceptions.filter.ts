import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const isHttpException = exception instanceof HttpException;
        const status = isHttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const fallbackMessage =
            status === HttpStatus.INTERNAL_SERVER_ERROR
                ? "Internal server error"
                : "Request failed";

        let message: string | string[] = fallbackMessage;
        let errorLabel: string | undefined;

        if (isHttpException) {
            const httpResponse = exception.getResponse() as
                | string
                | {
                    message?: string | string[];
                    error?: string;
                };
            if (typeof httpResponse === "string") {
                message = httpResponse;
            } else if (httpResponse?.message) {
                message = httpResponse.message;
            }
            errorLabel = typeof httpResponse === "object" ? httpResponse.error : undefined;
        } else if (exception && typeof exception === "object") {
            const rawMessage = (exception as { message?: string }).message;
            const errorName = (exception as { name?: string }).name;
            const isPrismaError = errorName?.startsWith("PrismaClient");
            if (isPrismaError) {
                message = "Database error. Please try again.";
            } else if (rawMessage) {
                message = rawMessage;
            }
            errorLabel = errorName;
        }

        this.logger.error(
            `${request.method} ${request.url} -> ${status}`,
            (exception as Error)?.stack ?? String(exception)
        );

        response.status(status).json({
            statusCode: status,
            message,
            error: errorLabel ?? (status === HttpStatus.INTERNAL_SERVER_ERROR ? "Internal Server Error" : undefined),
            path: request.url,
            timestamp: new Date().toISOString(),
        });
    }
}

