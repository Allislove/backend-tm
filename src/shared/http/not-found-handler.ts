import type { Request, Response } from 'express';

/* Este método responde 404 cuando la ruta de la API no existe. */
export function notFoundHandler(_request: Request, response: Response): void {
  response.status(404).json({
    error: {
      code: 'not_found',
      message: 'Ruta no encontrada.'
    }
  });
}
