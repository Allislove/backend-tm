import 'dotenv/config';

import { z } from 'zod';

/* Este método convierte cadenas vacías de entorno en undefined para que apliquen los valores por defecto. */
const optionalString = () =>
  z.preprocess((value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().trim().min(1).optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().trim().min(1).default('/api/v1'),
  CORS_ORIGIN: z.string().trim().min(1).default('http://localhost:3000'),
  JWT_SECRET: z.string().trim().min(16).default('dev-only-tickets-management-jwt-secret'),
  JWT_EXPIRES_IN: z.string().trim().min(1).default('8h'),
  DATABASE_URL: optionalString(),
  DB_HOST: z.string().trim().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().trim().min(1).default('tickets_management'),
  DB_USER: z.string().trim().min(1).default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DATABASE_SCHEMA: z
    .string()
    .trim()
    .regex(/^[a-z_][a-z0-9_]*$/i)
    .default('tms'),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  LOG_LEVEL: z.enum(['silent', 'error', 'warn', 'info', 'debug']).default('info')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Configuración de entorno inválida', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
