import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../shared/http/app-error';
import { verifyAccessToken } from '../shared/security/jwt';
import type { UserRole } from '../types/domain';

/* Este método extrae el Bearer token, valida el JWT y deja el usuario autenticado en la petición. */
export function authenticate(request: Request, _response: Response, next: NextFunction): void {
  try {
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'unauthenticated', 'Debes iniciar sesión para continuar.');
    }

    const token = header.slice('Bearer '.length).trim();

    if (!token) {
      throw new AppError(401, 'unauthenticated', 'Debes iniciar sesión para continuar.');
    }

    const payload = verifyAccessToken(token);

    request.authUser = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role
    };

    next();
  } catch (error) {
    next(error);
  }
}

/* Este método restringe una ruta a uno o más roles (admin, agent, supervisor). */
export function authorize(...roles: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    try {
      const user = request.authUser;

      if (!user) {
        throw new AppError(401, 'unauthenticated', 'Debes iniciar sesión para continuar.');
      }

      if (!roles.includes(user.role)) {
        throw new AppError(403, 'forbidden', 'No tienes permiso para realizar esta acción.');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/* Este método obtiene el usuario autenticado o lanza error si la ruta no pasó por authenticate. */
export function requireAuthUser(request: Request) {
  if (!request.authUser) {
    throw new AppError(401, 'unauthenticated', 'Debes iniciar sesión para continuar.');
  }

  return request.authUser;
}
