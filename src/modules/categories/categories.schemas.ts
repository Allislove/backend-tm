import { z } from 'zod';

export const listCategoriesQuerySchema = z.object({
  search: z.string().trim().optional(),
  includeInactive: z.enum(['true', 'false']).optional()
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(80),
  description: z.string().trim().max(400).optional(),
  isActive: z.boolean().optional().default(true)
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().max(400).optional().nullable(),
    isActive: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar.'
  });
