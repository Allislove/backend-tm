import type { Request, Response } from 'express';

import { requireAuthUser } from '../../middleware/auth';
import { parseOrThrow } from '../../shared/http/validation';
import {
  assignTicketSchema,
  createCommentSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  updateTicketSchema
} from './tickets.schemas';
import { ticketsService } from './tickets.service';

/* Este método lista tickets con filtros de estado, prioridad, cliente, categoría, agente y vencidos. */
export async function handleListTickets(request: Request, response: Response) {
  const authUser = requireAuthUser(request);
  const query = parseOrThrow(listTicketsQuerySchema, request.query);
  const result = await ticketsService.list(
    {
      search: query.search,
      status: query.status,
      priority: query.priority,
      clientId: query.clientId,
      assignedTo: query.assignedTo,
      categoryId: query.categoryId,
      stale: query.stale === 'true',
      page: query.page ?? 1,
      limit: query.limit ?? 10
    },
    authUser
  );
  response.json(result);
}

/* Este método obtiene el detalle de un ticket incluyendo requerimiento y comentarios. */
export async function handleGetTicket(request: Request, response: Response) {
  const authUser = requireAuthUser(request);
  const result = await ticketsService.getById(String(request.params.id), authUser);
  response.json(result);
}

/* Este método crea un ticket con cliente, título y requerimiento o detalle. */
export async function handleCreateTicket(request: Request, response: Response) {
  const authUser = requireAuthUser(request);
  const body = parseOrThrow(createTicketSchema, request.body);
  const result = await ticketsService.create(
    {
      ...body,
      priority: body.priority ?? 'medium'
    },
    authUser
  );
  response.status(201).json(result);
}

/* Este método actualiza un ticket existente según los permisos del rol. */
export async function handleUpdateTicket(request: Request, response: Response) {
  const authUser = requireAuthUser(request);
  const body = parseOrThrow(updateTicketSchema, request.body);
  const result = await ticketsService.update(String(request.params.id), body, authUser);
  response.json(result);
}

/* Este método asigna o reasigna un ticket a un usuario del equipo. */
export async function handleAssignTicket(request: Request, response: Response) {
  const authUser = requireAuthUser(request);
  const body = parseOrThrow(assignTicketSchema, request.body);
  const result = await ticketsService.assign(String(request.params.id), body.assignedTo, authUser);
  response.json(result);
}

/* Este método cierra un ticket. */
export async function handleCloseTicket(request: Request, response: Response) {
  const authUser = requireAuthUser(request);
  const result = await ticketsService.close(String(request.params.id), authUser);
  response.json(result);
}

/* Este método reabre un ticket cerrado. */
export async function handleReopenTicket(request: Request, response: Response) {
  const authUser = requireAuthUser(request);
  const result = await ticketsService.reopen(String(request.params.id), authUser);
  response.json(result);
}

/* Este método agrega un comentario público o una nota interna al ticket. */
export async function handleAddComment(request: Request, response: Response) {
  const authUser = requireAuthUser(request);
  const body = parseOrThrow(createCommentSchema, request.body);
  const result = await ticketsService.comment(
    String(request.params.id),
    { body: body.body, isInternal: body.isInternal ?? false },
    authUser
  );
  response.status(201).json(result);
}
