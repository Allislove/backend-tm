import jwt from 'jsonwebtoken';

import { env } from '../../config/env';
import { AppError } from '../http/app-error';
import type { UserRole } from '../../types/domain';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

/* Este método firma un JWT con el identificador, correo y rol del usuario autenticado. */
export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'tickets-management'
  });
}

/* Este método verifica un JWT y devuelve el payload si el token es válido. */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'tickets-management'
    });

    if (typeof decoded !== 'object' || !decoded.sub || !decoded.email || !decoded.role) {
      throw new AppError(401, 'invalid_token', 'El token de acceso no es válido.');
    }

    return {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role as UserRole
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(401, 'invalid_token', 'El token de acceso no es válido o expiró.');
  }
}
