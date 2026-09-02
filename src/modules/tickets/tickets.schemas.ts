import { z } from 'zod';

export const ticketStatusSchema = z.enum(['open', 'in_progress', 'pending', 'resolved', 'closed']);
export const ticketPrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);

export const listTicketsQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  clientId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional().or(z.literal('unassigned')),
  categoryId: z.string().uuid().optional(),
  stale: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});

export const createTicketSchema = z.object({
  clientId: z.string().uuid('Debes seleccionar un cliente.'),
  title: z.string().trim().min(3, 'El título debe tener al menos 3 caracteres.').max(180),
  requirement: z
    .string()
    .trim()
    .min(10, 'Describe el requerimiento o detalle del ticket (mínimo 10 caracteres).')
    .max(8000),
  priority: ticketPrioritySchema.default('medium'),
  categoryId: z.string().uuid('Debes seleccionar una categoría del catálogo.'),
  assignedTo: z.string().uuid().optional().nullable()
});

export const updateTicketSchema = z
  .object({
    title: z.string().trim().min(3).max(180).optional(),
    requirement: z.string().trim().min(10).max(8000).optional(),
    status: z.enum(['open', 'in_progress', 'pending', 'resolved']).optional(),
    priority: ticketPrioritySchema.optional(),
    categoryId: z.string().uuid().optional().nullable()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar.'
  });

export const assignTicketSchema = z.object({
  assignedTo: z.string().uuid().nullable()
});

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'El comentario no puede estar vacío.').max(4000),
  isInternal: z.boolean().optional().default(false)
});
