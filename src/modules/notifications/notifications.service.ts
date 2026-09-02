import { AppError } from '../../shared/http/app-error';
import {
  countUnreadNotifications,
  createNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from './notifications.repository';

const PREVIEW_LENGTH = 160;

/* Este método recorta el cuerpo de una nota para la campana, sin filtrar datos internos. */
function previewBody(body: string, isInternal: boolean): string {
  if (isInternal) {
    return 'Revisa la nota interna en el detalle del ticket.';
  }

  const compact = body.replace(/\s+/g, ' ').trim();
  if (compact.length <= PREVIEW_LENGTH) {
    return compact;
  }

  return `${compact.slice(0, PREVIEW_LENGTH - 1)}…`;
}

export const notificationsService = {
  /* Este método lista las notificaciones del usuario y el conteo de no leídas. */
  async list(userId: string) {
    const [items, unreadCount] = await Promise.all([
      listNotifications(userId),
      countUnreadNotifications(userId)
    ]);

    return { items, meta: { unreadCount } };
  },

  /* Este método avisa al asignado y al creador cuando hay un comentario o nota. */
  async notifyTicketNote(input: {
    actorId: string;
    actorName: string;
    ticketId: string;
    ticketNumber: string;
    assignedTo: string | null;
    createdBy: string;
    commentId: string;
    isInternal: boolean;
    body: string;
  }) {
    const recipients = new Set<string>();

    if (input.assignedTo && input.assignedTo !== input.actorId) {
      recipients.add(input.assignedTo);
    }

    if (input.createdBy !== input.actorId) {
      recipients.add(input.createdBy);
    }

    if (recipients.size === 0) {
      return;
    }

    const type = input.isInternal ? 'internal_note' : 'comment';
    const action = input.isInternal ? 'una nota interna' : 'un comentario';
    const title = `${input.actorName} dejó ${action} en ${input.ticketNumber}`;
    const body = previewBody(input.body, input.isInternal);

    await createNotifications(
      [...recipients].map((userId) => ({
        userId,
        actorId: input.actorId,
        ticketId: input.ticketId,
        commentId: input.commentId,
        type,
        title,
        body
      }))
    );
  },

  /* Este método marca una notificación como leída. */
  async markRead(id: string, userId: string) {
    const updated = await markNotificationRead(id, userId);

    if (!updated) {
      throw new AppError(404, 'notification_not_found', 'La notificación no existe.');
    }

    return { item: { id, read: true } };
  },

  /* Este método marca todas las notificaciones del usuario como leídas. */
  async markAllRead(userId: string) {
    await markAllNotificationsRead(userId);
    return { item: { read: true } };
  }
};
