import type { z, ZodTypeAny } from 'zod';

import { AppError } from './app-error';

/* Este método valida un payload con Zod y lanza un error 400 si los datos no cumplen el esquema. */
export function parseOrThrow<S extends ZodTypeAny>(schema: S, payload: unknown): z.infer<S> {
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new AppError(
      400,
      'validation_error',
      'Los datos enviados no son válidos.',
      parsed.error.flatten()
    );
  }

  return parsed.data;
}
