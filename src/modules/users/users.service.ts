import { AppError } from '../../shared/http/app-error';
import { findUserByEmail } from '../auth/auth.repository';
import { createUser, listAssignableAgents, listUsers, updateUser } from './users.repository';

export const usersService = {
  /* Este método lista usuarios para el administrador (y agentes asignables para otros roles). */
  async list(filters: Parameters<typeof listUsers>[0], role: string) {
    if (role !== 'admin') {
      const items = await listAssignableAgents();
      return {
        items,
        meta: { page: 1, limit: items.length || 100, total: items.length }
      };
    }

    const result = await listUsers(filters);
    return { ...result, meta: { ...result.meta, total: result.meta.total } };
  },

  /* Este método crea un usuario; solo el administrador puede invocarlo. */
  async create(input: Parameters<typeof createUser>[0]) {
    const existing = await findUserByEmail(input.email);

    if (existing) {
      throw new AppError(409, 'email_already_registered', 'Ya existe un usuario con ese correo.');
    }

    return { item: await createUser(input) };
  },

  /* Este método actualiza un usuario existente. */
  async update(userId: string, input: Parameters<typeof updateUser>[1]) {
    return { item: await updateUser(userId, input) };
  }
};
