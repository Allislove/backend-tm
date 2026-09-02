import { query } from '../../database/pool';
import type { UserRole } from '../../types/domain';

export interface UserRow {
  id: string;
  roleId: string;
  roleCode: UserRole;
  roleName: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

/* Este método busca un usuario activo por correo electrónico, incluyendo su rol. */
export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await query<UserRow>(
    `select
       u.id,
       u.role_id as "roleId",
       r.code::text as "roleCode",
       r.name as "roleName",
       u.email,
       u.password_hash as "passwordHash",
       u.first_name as "firstName",
       u.last_name as "lastName",
       u.is_active as "isActive",
       u.last_login_at as "lastLoginAt",
       u.created_at as "createdAt"
     from users u
     join roles r on r.id = u.role_id
     where lower(u.email) = lower($1)
     limit 1`,
    [email]
  );

  return result.rows[0] ?? null;
}

/* Este método busca un usuario por identificador, incluyendo su rol. */
export async function findUserById(userId: string): Promise<UserRow | null> {
  const result = await query<UserRow>(
    `select
       u.id,
       u.role_id as "roleId",
       r.code::text as "roleCode",
       r.name as "roleName",
       u.email,
       u.password_hash as "passwordHash",
       u.first_name as "firstName",
       u.last_name as "lastName",
       u.is_active as "isActive",
       u.last_login_at as "lastLoginAt",
       u.created_at as "createdAt"
     from users u
     join roles r on r.id = u.role_id
     where u.id = $1
     limit 1`,
    [userId]
  );

  return result.rows[0] ?? null;
}

/* Este método registra la fecha del último inicio de sesión del usuario. */
export async function updateLastLoginAt(userId: string): Promise<void> {
  await query(`update users set last_login_at = now() where id = $1`, [userId]);
}
