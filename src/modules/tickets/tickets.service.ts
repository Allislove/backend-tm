import { AppError } from '../../shared/http/app-error';
import { findClientById } from '../clients/clients.repository';
import { findCategoryById } from '../categories/categories.repository';
import { markTicketNotificationsRead } from '../notifications/notifications.repository';
import { notificationsService } from '../notifications/notifications.service';
import type { UserRole } from '../../types/domain';
import {
  addComment,
  assignTicket,
  closeTicket,
  createTicket,
  findTicketByIdOrNumber,
  listComments,
  listEvents,
  listTickets,
  reopenTicket,
  updateTicket,
  type TicketListRow
} from './tickets.repository';

interface Actor {
  userId: string;
  role: UserRole;
}

/* Este método indica si el actor puede modificar el contenido o estado de un ticket. */
function canMutateTicket(actor: Actor, ticket: TicketListRow): boolean {
  if (actor.role === 'admin') {
    return true;
  }

  if (actor.role === 'agent' && ticket.assignedTo === actor.userId) {
    return true;
  }

  return false;
}

/* Este método indica si el actor puede asignar o reasignar tickets. */
function canAssign(actor: Actor): boolean {
  return actor.role === 'admin' || actor.role === 'supervisor';
}

/* Este método valida que la categoría exista y esté activa, y devuelve su nombre para denormalizar. */
async function resolveActiveCategory(categoryId: string) {
  const category = await findCategoryById(categoryId);

  if (!category || !category.isActive) {
    throw new AppError(400, 'invalid_category', 'La categoría no existe o está inactiva. Crea o actívala desde el catálogo.');
  }

  return category;
}

export const ticketsService = {
  /* Este método lista tickets con filtros; el supervisor puede pedir vencidos o sin actualización. */
  async list(filters: Parameters<typeof listTickets>[0], actor: Actor) {
    if (filters.stale && actor.role === 'agent') {
      throw new AppError(403, 'forbidden', 'Solo el supervisor o el administrador pueden ver tickets sin actualización.');
    }

    return listTickets(filters);
  },

  /* Este método obtiene el detalle completo: ticket, requerimiento, comentarios y actividad. */
  async getById(idOrNumber: string, actor: Actor) {
    const ticket = await findTicketByIdOrNumber(idOrNumber);

    if (!ticket) {
      throw new AppError(404, 'ticket_not_found', 'El ticket no existe.');
    }

    const includeInternal = actor.role === 'admin' || actor.role === 'supervisor';
    const comments = await listComments(ticket.id, includeInternal);
    const events = await listEvents(ticket.id);
    await markTicketNotificationsRead(actor.userId, ticket.id);

    return {
      item: {
        ...ticket,
        comments,
        events
      }
    };
  },

  /* Este método crea un ticket con cliente, título, requerimiento y categoría del catálogo. */
  async create(
    input: {
      clientId: string;
      title: string;
      requirement: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
      categoryId: string;
      assignedTo?: string | null;
    },
    actor: Actor
  ) {
    const client = await findClientById(input.clientId);

    if (!client || !client.isActive) {
      throw new AppError(400, 'invalid_client', 'El cliente no existe o está inactivo.');
    }

    if (input.assignedTo && actor.role === 'agent') {
      throw new AppError(403, 'forbidden', 'Un agente no puede asignar tickets al crearlos.');
    }

    const category = await resolveActiveCategory(input.categoryId);

    const ticket = await createTicket({
      ...input,
      categoryId: category.id,
      category: category.name,
      createdBy: actor.userId
    });

    return { item: ticket };
  },

  /* Este método actualiza título, requerimiento, prioridad o estado según el rol. */
  async update(
    idOrNumber: string,
    input: {
      title?: string;
      requirement?: string;
      status?: 'open' | 'in_progress' | 'pending' | 'resolved';
      priority?: 'critical' | 'high' | 'medium' | 'low';
      categoryId?: string | null;
    },
    actor: Actor
  ) {
    const ticket = await findTicketByIdOrNumber(idOrNumber);

    if (!ticket) {
      throw new AppError(404, 'ticket_not_found', 'El ticket no existe.');
    }

    if (ticket.status === 'closed' && actor.role !== 'admin') {
      throw new AppError(409, 'ticket_closed', 'El ticket está cerrado. Solo un administrador puede reabrirlo.');
    }

    if (!canMutateTicket(actor, ticket)) {
      throw new AppError(403, 'forbidden', 'Solo puedes actualizar tickets asignados a ti.');
    }

    if (input.status === 'resolved' && actor.role === 'agent' && ticket.assignedTo !== actor.userId) {
      throw new AppError(403, 'forbidden', 'No puedes cambiar el estado de un ticket que no te fue asignado.');
    }

    let categoryName: string | null | undefined;
    let categoryId = input.categoryId;

    if (input.categoryId) {
      const category = await resolveActiveCategory(input.categoryId);
      categoryId = category.id;
      categoryName = category.name;
    } else if (input.categoryId === null) {
      categoryName = null;
    }

    return {
      item: await updateTicket(ticket.id, actor.userId, {
        ...input,
        categoryId,
        category: categoryName
      })
    };
  },

  /* Este método asigna o reasigna un ticket a un agente. */
  async assign(idOrNumber: string, assignedTo: string | null, actor: Actor) {
    if (!canAssign(actor)) {
      throw new AppError(403, 'forbidden', 'No tienes permiso para asignar tickets.');
    }

    const ticket = await findTicketByIdOrNumber(idOrNumber);

    if (!ticket) {
      throw new AppError(404, 'ticket_not_found', 'El ticket no existe.');
    }

    return { item: await assignTicket(ticket.id, assignedTo, actor.userId) };
  },

  /* Este método cierra un ticket. Reservado al administrador. */
  async close(idOrNumber: string, actor: Actor) {
    if (actor.role !== 'admin') {
      throw new AppError(403, 'forbidden', 'Solo el administrador puede cerrar tickets.');
    }

    const ticket = await findTicketByIdOrNumber(idOrNumber);

    if (!ticket) {
      throw new AppError(404, 'ticket_not_found', 'El ticket no existe.');
    }

    return { item: await closeTicket(ticket.id, actor.userId) };
  },

  /* Este método reabre un ticket cerrado. Reservado al administrador. */
  async reopen(idOrNumber: string, actor: Actor) {
    if (actor.role !== 'admin') {
      throw new AppError(403, 'forbidden', 'Solo el administrador puede reabrir tickets.');
    }

    const ticket = await findTicketByIdOrNumber(idOrNumber);

    if (!ticket) {
      throw new AppError(404, 'ticket_not_found', 'El ticket no existe.');
    }

    return { item: await reopenTicket(ticket.id, actor.userId) };
  },

  /* Este método agrega un comentario; las notas internas las usan supervisor y administrador. */
  async comment(
    idOrNumber: string,
    input: { body: string; isInternal: boolean },
    actor: Actor
  ) {
    const ticket = await findTicketByIdOrNumber(idOrNumber);

    if (!ticket) {
      throw new AppError(404, 'ticket_not_found', 'El ticket no existe.');
    }

    if (input.isInternal && actor.role === 'agent') {
      throw new AppError(403, 'forbidden', 'Un agente no puede agregar comentarios internos.');
    }

    if (actor.role === 'agent' && ticket.assignedTo !== actor.userId && ticket.createdBy !== actor.userId) {
      throw new AppError(403, 'forbidden', 'Solo puedes comentar tickets asignados a ti.');
    }

    const comment = await addComment({
      ticketId: ticket.id,
      authorId: actor.userId,
      body: input.body,
      isInternal: input.isInternal
    });

    await notificationsService.notifyTicketNote({
      actorId: actor.userId,
      actorName: comment.authorName,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      assignedTo: ticket.assignedTo,
      createdBy: ticket.createdBy,
      commentId: comment.id,
      isInternal: input.isInternal,
      body: comment.body
    });

    return { item: comment };
  }
};
