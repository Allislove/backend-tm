import { AppError } from '../../shared/http/app-error';
import type { UserRole } from '../../types/domain';
import {
  createCategory,
  findCategoryById,
  findCategoryByName,
  listCategories,
  updateCategory
} from './categories.repository';

export const categoriesService = {
  /* Este método lista categorías activas para el formulario de tickets, o todas si el admin lo pide. */
  async list(filters: { search?: string; includeInactive?: boolean }, role: UserRole) {
    return listCategories({
      search: filters.search,
      includeInactive: role === 'admin' ? Boolean(filters.includeInactive) : false
    });
  },

  /* Este método crea una categoría; solo el administrador puede hacerlo. */
  async create(input: { name: string; description?: string; isActive: boolean }) {
    const existing = await findCategoryByName(input.name);

    if (existing) {
      throw new AppError(409, 'category_already_exists', 'Ya existe una categoría con ese nombre.');
    }

    return { item: await createCategory(input) };
  },

  /* Este método actualiza una categoría del catálogo. */
  async update(
    id: string,
    input: { name?: string; description?: string | null; isActive?: boolean }
  ) {
    const current = await findCategoryById(id);

    if (!current) {
      throw new AppError(404, 'category_not_found', 'La categoría no existe.');
    }

    if (input.name && input.name.trim().toLowerCase() !== current.name.toLowerCase()) {
      const existing = await findCategoryByName(input.name);

      if (existing && existing.id !== id) {
        throw new AppError(409, 'category_already_exists', 'Ya existe una categoría con ese nombre.');
      }
    }

    return { item: await updateCategory(id, input) };
  }
};
