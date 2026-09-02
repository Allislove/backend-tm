import type { Request, Response } from 'express';

import { parseOrThrow } from '../../shared/http/validation';
import { createClientSchema, listClientsQuerySchema, updateClientSchema } from './clients.schemas';
import { clientsService } from './clients.service';

/* Este método lista clientes con búsqueda y paginación. */
export async function handleListClients(request: Request, response: Response) {
  const query = parseOrThrow(listClientsQuerySchema, request.query);
  const result = await clientsService.list({
    search: query.search,
    page: query.page ?? 1,
    limit: query.limit ?? 50
  });
  response.json(result);
}

/* Este método obtiene el detalle de un cliente. */
export async function handleGetClient(request: Request, response: Response) {
  const result = await clientsService.getById(String(request.params.id));
  response.json(result);
}

/* Este método crea un cliente. */
export async function handleCreateClient(request: Request, response: Response) {
  const body = parseOrThrow(createClientSchema, request.body);
  const result = await clientsService.create(body);
  response.status(201).json(result);
}

/* Este método actualiza un cliente. */
export async function handleUpdateClient(request: Request, response: Response) {
  const body = parseOrThrow(updateClientSchema, request.body);
  const result = await clientsService.update(String(request.params.id), body);
  response.json(result);
}
