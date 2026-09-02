import { query } from '../../database/pool';
import { AppError } from '../../shared/http/app-error';

export interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  ticketCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CATEGORY_SELECT = `
  c.id,
  c.name,
  c.description,
  c.is_active as "isActive",
  (
    select count(*)::int
    from tickets t
    where t.category_id = c.id
  ) as "ticketCount",
  c.created_at as "createdAt",
  c.updated_at as "updatedAt"
`;

/* Este método lista las categorías del catálogo, con búsqueda y opción de incluir inactivas. */
export async function listCategories(filters: { search?: string; includeInactive?: boolean }) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (!filters.includeInactive) {
    conditions.push('c.is_active = true');
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(c.name ilike $${params.length} or coalesce(c.description, '') ilike $${params.length})`);
  }

  const where = conditions.length > 0 ? `where ${conditions.join(' and ')}` : '';

  const result = await query<CategoryRow>(
    `select ${CATEGORY_SELECT}
     from categories c
     ${where}
     order by c.name`,
    params
  );

  return {
    items: result.rows,
    meta: { page: 1, limit: result.rows.length || 50, total: result.rows.length }
  };
}

/* Este método obtiene una categoría por su identificador. */
export async function findCategoryById(id: string): Promise<CategoryRow | null> {
  const result = await query<CategoryRow>(
    `select ${CATEGORY_SELECT}
     from categories c
     where c.id = $1
     limit 1`,
    [id]
  );

  return result.rows[0] ?? null;
}

/* Este método busca una categoría por nombre, ignorando mayúsculas y espacios. */
export async function findCategoryByName(name: string): Promise<CategoryRow | null> {
  const result = await query<CategoryRow>(
    `select ${CATEGORY_SELECT}
     from categories c
     where lower(trim(c.name)) = lower(trim($1))
     limit 1`,
    [name]
  );

  return result.rows[0] ?? null;
}

/* Este método crea una categoría en el catálogo de tickets. */
export async function createCategory(input: {
  name: string;
  description?: string | null;
  isActive: boolean;
}): Promise<CategoryRow> {
  const inserted = await query<{ id: string }>(
    `insert into categories (name, description, is_active)
     values ($1, $2, $3)
     returning id`,
    [input.name.trim(), input.description?.trim() || null, input.isActive]
  );

  const created = inserted.rows[0];

  if (!created) {
    throw new AppError(500, 'category_creation_failed', 'No fue posible crear la categoría.');
  }

  const category = await findCategoryById(created.id);

  if (!category) {
    throw new AppError(500, 'category_creation_failed', 'La categoría se creó pero no pudo consultarse.');
  }

  return category;
}

/* Este método actualiza nombre, descripción o estado de una categoría. */
export async function updateCategory(
  id: string,
  input: { name?: string; description?: string | null; isActive?: boolean }
): Promise<CategoryRow> {
  const current = await findCategoryById(id);

  if (!current) {
    throw new AppError(404, 'category_not_found', 'La categoría no existe.');
  }

  await query(
    `update categories
     set
       name = coalesce($2, name),
       description = case when $3::text = '__UNSET__' then description else $3 end,
       is_active = coalesce($4, is_active)
     where id = $1`,
    [
      id,
      input.name?.trim() ?? null,
      input.description === undefined ? '__UNSET__' : input.description?.trim() || null,
      input.isActive ?? null
    ]
  );

  if (input.name && input.name.trim() !== current.name) {
    await query(`update tickets set category = $2 where category_id = $1`, [id, input.name.trim()]);
  }

  const updated = await findCategoryById(id);

  if (!updated) {
    throw new AppError(404, 'category_not_found', 'La categoría no existe.');
  }

  return updated;
}
