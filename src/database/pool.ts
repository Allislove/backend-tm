import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

import { env } from '../config/env';

const poolConfig = env.DATABASE_URL
  ? {
      connectionString: env.DATABASE_URL,
      max: env.DB_POOL_MAX
    }
  : {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      max: env.DB_POOL_MAX
    };

export const pool = new Pool({
  ...poolConfig
});

pool.on('connect', async (client) => {
  await client.query(`set search_path to ${env.DATABASE_SCHEMA}, public`);
});

/* Este método ejecuta una consulta parametrizada contra PostgreSQL. */
export async function query<T extends QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

/* Este método ejecuta un bloque de trabajo dentro de una transacción con rollback automático. */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('begin');
    await client.query(`set local search_path to ${env.DATABASE_SCHEMA}, public`);
    const result = await callback(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

/* Este método verifica que la API pueda conectar a PostgreSQL y al esquema tms. */
export async function verifyDatabaseConnection() {
  const result = await query<{
    databaseName: string;
    currentSchema: string;
    currentUser: string;
  }>(
    `select
       current_database() as "databaseName",
       current_schema() as "currentSchema",
       current_user as "currentUser"`
  );

  return result.rows[0] ?? null;
}
