import { query } from '../../database/pool';
import { AppError } from '../../shared/http/app-error';

export interface ClientRow {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/* Este método lista clientes con búsqueda por nombre o contacto. */
export async function listClients(filters: { search?: string; page: number; limit: number }) {
  const params: unknown[] = [];
  let where = '';

  if (filters.search) {
    params.push(`%${filters.search}%`);
    where = `where name ilike $1 or contact_name ilike $1 or contact_email ilike $1`;
  }

  const countResult = await query<{ total: string }>(
    `select count(*)::text as total from clients ${where}`,
    params
  );

  const offset = (filters.page - 1) * filters.limit;
  params.push(filters.limit, offset);

  const result = await query<ClientRow>(
    `select
       id,
       name,
       contact_name as "contactName",
       contact_email as "contactEmail",
       contact_phone as "contactPhone",
       notes,
       is_active as "isActive",
       created_at as "createdAt",
       updated_at as "updatedAt"
     from clients
     ${where}
     order by name
     limit $${params.length - 1} offset $${params.length}`,
    params
  );

  return {
    items: result.rows,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total: Number(countResult.rows[0]?.total ?? 0)
    }
  };
}

/* Este método obtiene un cliente por identificador. */
export async function findClientById(clientId: string): Promise<ClientRow | null> {
  const result = await query<ClientRow>(
    `select
       id,
       name,
       contact_name as "contactName",
       contact_email as "contactEmail",
       contact_phone as "contactPhone",
       notes,
       is_active as "isActive",
       created_at as "createdAt",
       updated_at as "updatedAt"
     from clients
     where id = $1`,
    [clientId]
  );

  return result.rows[0] ?? null;
}

/* Este método crea un cliente de soporte. */
export async function createClient(input: {
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}): Promise<ClientRow> {
  const result = await query<ClientRow>(
    `insert into clients (name, contact_name, contact_email, contact_phone, notes)
     values ($1, $2, $3, $4, $5)
     returning
       id,
       name,
       contact_name as "contactName",
       contact_email as "contactEmail",
       contact_phone as "contactPhone",
       notes,
       is_active as "isActive",
       created_at as "createdAt",
       updated_at as "updatedAt"`,
    [
      input.name,
      input.contactName ?? null,
      input.contactEmail ? input.contactEmail : null,
      input.contactPhone ?? null,
      input.notes ?? null
    ]
  );

  const created = result.rows[0];

  if (!created) {
    throw new AppError(500, 'client_creation_failed', 'No fue posible crear el cliente.');
  }

  return created;
}

/* Este método actualiza los datos de un cliente existente. */
export async function updateClient(
  clientId: string,
  input: {
    name?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    notes?: string;
    isActive?: boolean;
  }
): Promise<ClientRow> {
  const result = await query<ClientRow>(
    `update clients
     set
       name = coalesce($2, name),
       contact_name = coalesce($3, contact_name),
       contact_email = coalesce($4, contact_email),
       contact_phone = coalesce($5, contact_phone),
       notes = coalesce($6, notes),
       is_active = coalesce($7, is_active)
     where id = $1
     returning
       id,
       name,
       contact_name as "contactName",
       contact_email as "contactEmail",
       contact_phone as "contactPhone",
       notes,
       is_active as "isActive",
       created_at as "createdAt",
       updated_at as "updatedAt"`,
    [
      clientId,
      input.name ?? null,
      input.contactName ?? null,
      input.contactEmail === undefined ? null : input.contactEmail || null,
      input.contactPhone ?? null,
      input.notes ?? null,
      input.isActive ?? null
    ]
  );

  const updated = result.rows[0];

  if (!updated) {
    throw new AppError(404, 'client_not_found', 'El cliente no existe.');
  }

  return updated;
}
