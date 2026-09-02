import type { NextFunction, Request, Response, RequestHandler } from 'express';

/* Este método envuelve controladores async para reenviar errores al manejador centralizado. */
export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}
