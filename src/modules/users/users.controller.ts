import type { Request, Response } from 'express';

import { requireAuthUser } from '../../middleware/auth';
import { parseOrThrow } from '../../shared/http/validation';
import { createUserSchema, listUsersQuerySchema, updateUserSchema } from './users.schemas';
import { usersService } from './users.service';

/* Este método lista usuarios o agentes asignables según el rol de quien consulta. */
export async function handleListUsers(request: Request, response: Response) {
  const authUser = requireAuthUser(request);
  const query = parseOrThrow(listUsersQuerySchema, request.query);
    const result = await usersService.list(
      {
        search: query.search,
        role: query.role,
        page: query.page ?? 1,
        limit: query.limit ?? 50
      },
      authUser.role
    );
  response.json(result);
}

/* Este método crea un usuario del equipo de soporte. */
export async function handleCreateUser(request: Request, response: Response) {
  const body = parseOrThrow(createUserSchema, request.body);
  const result = await usersService.create({
    ...body,
    isActive: body.isActive ?? true
  });
  response.status(201).json(result);
}

/* Este método actualiza nombre, rol, estado o contraseña de un usuario. */
export async function handleUpdateUser(request: Request, response: Response) {
  const body = parseOrThrow(updateUserSchema, request.body);
  const result = await usersService.update(String(request.params.id), body);
  response.json(result);
}
