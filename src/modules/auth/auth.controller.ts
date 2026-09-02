import type { Request, Response } from 'express';

import { requireAuthUser } from '../../middleware/auth';
import { parseOrThrow } from '../../shared/http/validation';
import { authService } from './auth.service';
import { loginSchema } from './auth.schemas';

/* Este método inicia sesión con correo y contraseña y responde con JWT + perfil. */
export async function handleLogin(request: Request, response: Response) {
  const body = parseOrThrow(loginSchema, request.body);
  const result = await authService.login(body);
  response.json(result);
}

/* Este método devuelve el usuario autenticado asociado al token JWT. */
export async function handleMe(request: Request, response: Response) {
  const authUser = requireAuthUser(request);
  const result = await authService.me(authUser.userId);
  response.json(result);
}
