import type { NextFunction, Request, Response } from 'express';

import { AppError } from './app-error';

/* Este método convierte errores de aplicación y no controlados en respuestas JSON consistentes. */
export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
): void {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? null
      }
    });
    return;
  }

  console.error(error);

  response.status(500).json({
    error: {
      code: 'internal_server_error',
      message: 'Ocurrió un error interno. Intenta de nuevo.'
    }
  });
}
