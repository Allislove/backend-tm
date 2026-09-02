import { createClient, findClientById, listClients, updateClient } from './clients.repository';
import { AppError } from '../../shared/http/app-error';

export const clientsService = {
  /* Este método lista clientes para operación y para el formulario de tickets. */
  async list(filters: Parameters<typeof listClients>[0]) {
    return listClients(filters);
  },

  /* Este método obtiene un cliente o lanza 404 si no existe. */
  async getById(clientId: string) {
    const client = await findClientById(clientId);

    if (!client) {
      throw new AppError(404, 'client_not_found', 'El cliente no existe.');
    }

    return { item: client };
  },

  /* Este método crea un cliente. */
  async create(input: Parameters<typeof createClient>[0]) {
    return { item: await createClient(input) };
  },

  /* Este método actualiza un cliente. */
  async update(clientId: string, input: Parameters<typeof updateClient>[1]) {
    return { item: await updateClient(clientId, input) };
  }
};
