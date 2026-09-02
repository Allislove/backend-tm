import { query } from '../../database/pool';
import { AppError } from '../../shared/http/app-error';
import { hashPassword } from '../../shared/security/password';
import type { UserRole } from '../../types/domain';

export interface ListedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: UserRole;
  roleName: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

/* Este método lista usuarios con filtro opcional por texto y rol, incluyendo paginación. */
export async function listUsers(filters: {
  search?: string;
  role?: UserRole;
  page: number;
  limit: number;
}) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(
      `(u.email ilike $${params.length} or u.first_name ilike $${params.length} or u.last_name ilike $${params.length})`
    );
  }

  if (filters.role) {
    params.push(filters.role);
    conditions.push(`r.code = $${params.length}`);
  }

  const where = conditions.length > 0 ? `where ${conditions.join(' and ')}` : '';
  const offset = (filters.page - 1) * filters.limit;

  const countResult = await query<{ total: string }>(
    `select count(*)::text as total
     from users u
     join roles r on r.id = u.role_id
     ${where}`,
    params
  );

  params.push(filters.limit, offset);

  const result = await query<ListedUser>(
    `select
       u.id,
       u.email,
       u.first_name as "firstName",
       u.last_name as "lastName",
       trim(u.first_name || ' ' || u.last_name) as "displayName",
       r.code::text as role,
       r.name as "roleName",
       u.is_active as "isActive",
       u.last_login_at as "lastLoginAt",
       u.created_at as "createdAt"
     from users u
     join roles r on r.id = u.role_id
     ${where}
     order by u.first_name, u.last_name
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

/* Este método obtiene el id de un rol a partir de su código. */
export async function findRoleIdByCode(role: UserRole): Promise<string> {
  const result = await query<{ id: string }>(`select id from roles where code = $1`, [role]);
  const roleId = result.rows[0]?.id;

  if (!roleId) {
    throw new AppError(400, 'invalid_role', 'El rol indicado no existe.');
  }

  return roleId;
}

/* Este método crea un usuario con contraseña hasheada y el rol indicado. */
export async function createUser(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
}): Promise<ListedUser> {
  const roleId = await findRoleIdByCode(input.role);
  const passwordHash = await hashPassword(input.password);

  const result = await query<ListedUser>(
    `insert into users (role_id, email, password_hash, first_name, last_name, is_active)
     values ($1, $2, $3, $4, $5, $6)
     returning
       id,
       email,
       first_name as "firstName",
       last_name as "lastName",
       trim(first_name || ' ' || last_name) as "displayName",
       $7::text as role,
       (select name from roles where id = $1) as "roleName",
       is_active as "isActive",
       last_login_at as "lastLoginAt",
       created_at as "createdAt"`,
    [roleId, input.email.toLowerCase(), passwordHash, input.firstName, input.lastName, input.isActive, input.role]
  );

  const created = result.rows[0];

  if (!created) {
    throw new AppError(500, 'user_creation_failed', 'No fue posible crear el usuario.');
  }

  return created;
}

/* Este método actualiza datos, rol o contraseña de un usuario existente. */
export async function updateUser(
  userId: string,
  input: {
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    isActive?: boolean;
    password?: string;
  }
): Promise<ListedUser> {
  const roleId = input.role ? await findRoleIdByCode(input.role) : null;
  const passwordHash = input.password ? await hashPassword(input.password) : null;

  const result = await query<ListedUser>(
    `update users
     set
       first_name = coalesce($2, first_name),
       last_name = coalesce($3, last_name),
       role_id = coalesce($4, role_id),
       is_active = coalesce($5, is_active),
       password_hash = coalesce($6, password_hash)
     where id = $1
     returning
       id,
       email,
       first_name as "firstName",
       last_name as "lastName",
       trim(first_name || ' ' || last_name) as "displayName",
       (select code::text from roles where id = users.role_id) as role,
       (select name from roles where id = users.role_id) as "roleName",
       is_active as "isActive",
       last_login_at as "lastLoginAt",
       created_at as "createdAt"`,
    [userId, input.firstName ?? null, input.lastName ?? null, roleId, input.isActive ?? null, passwordHash]
  );

  const updated = result.rows[0];

  if (!updated) {
    throw new AppError(404, 'user_not_found', 'El usuario no existe.');
  }

  return updated;
}

/* Este método lista agentes activos para los selectores de asignación. */
export async function listAssignableAgents(): Promise<ListedUser[]> {
  const result = await query<ListedUser>(
    `select
       u.id,
       u.email,
       u.first_name as "firstName",
       u.last_name as "lastName",
       trim(u.first_name || ' ' || u.last_name) as "displayName",
       r.code::text as role,
       r.name as "roleName",
       u.is_active as "isActive",
       u.last_login_at as "lastLoginAt",
       u.created_at as "createdAt"
     from users u
     join roles r on r.id = u.role_id
     where u.is_active = true
       and r.code in ('agent', 'supervisor', 'admin')
     order by u.first_name, u.last_name`
  );

  return result.rows;
}
