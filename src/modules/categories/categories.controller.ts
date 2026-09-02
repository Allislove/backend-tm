import type { Request, Response } from 'express';

import { requireAuthUser } from '../../middleware/auth';
import { parseOrThrow } from '../../shared/http/validation';
import { createCategorySchema, listCategoriesQuerySchema, updateCategorySchema } from './categories.schemas';
import { categoriesService } from './categories.service';

/* Este método lista el catálogo de categorías para armar selects y el módulo de administración. */
export async function handleListCategories(request: Request, response: Response) {
  const authUser = requireAuthUser(request);
  const query = parseOrThrow(listCategoriesQuerySchema, request.query);
  const result = await categoriesService.list(
    {
      search: query.search,
      includeInactive: query.includeInactive === 'true'
    },
    authUser.role
  );
  response.json(result);
}

/* Este método crea una categoría desde el dashboard del administrador. */
export async function handleCreateCategory(request: Request, response: Response) {
  const body = parseOrThrow(createCategorySchema, request.body);
  const result = await categoriesService.create({
    ...body,
    isActive: body.isActive ?? true
  });
  response.status(201).json(result);
}

/* Este método actualiza o desactiva una categoría existente. */
export async function handleUpdateCategory(request: Request, response: Response) {
  const body = parseOrThrow(updateCategorySchema, request.body);
  const result = await categoriesService.update(String(request.params.id), body);
  response.json(result);
}
