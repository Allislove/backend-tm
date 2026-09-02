import { query } from '../../database/pool';

export interface NotificationRow {
  id: string;
  userId: string;
  actorId: string;
  actorName: string;
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  commentId: string | null;
  type: 'comment' | 'internal_note';
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
}

/* Este método lista las notificaciones recientes del usuario autenticado. */
export async function listNotifications(userId: string, limit = 20): Promise<NotificationRow[]> {
  const result = await query<NotificationRow>(
    `select
       n.id,
       n.user_id as "userId",
       n.actor_id as "actorId",
       trim(u.first_name || ' ' || u.last_name) as "actorName",
       n.ticket_id as "ticketId",
       t.ticket_number as "ticketNumber",
       t.title as "ticketTitle",
       n.comment_id as "commentId",
       n.type,
       n.title,
       n.body,
       n.read_at as "readAt",
       n.created_at as "createdAt"
     from notifications n
     join users u on u.id = n.actor_id
     join tickets t on t.id = n.ticket_id
     where n.user_id = $1
     order by n.created_at desc
     limit $2`,
    [userId, limit]
  );

  return result.rows;
}

/* Este método cuenta las notificaciones no leídas del usuario. */
export async function countUnreadNotifications(userId: string): Promise<number> {
  const result = await query<{ count: string }>(
    `select count(*)::text as count
     from notifications
     where user_id = $1
       and read_at is null`,
    [userId]
  );

  return Number(result.rows[0]?.count ?? 0);
}

/* Este método crea notificaciones para uno o más destinatarios. */
export async function createNotifications(
  rows: Array<{
    userId: string;
    actorId: string;
    ticketId: string;
    commentId: string | null;
    type: 'comment' | 'internal_note';
    title: string;
    body: string;
  }>
): Promise<void> {
  for (const row of rows) {
    await query(
      `insert into notifications (user_id, actor_id, ticket_id, comment_id, type, title, body)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [row.userId, row.actorId, row.ticketId, row.commentId, row.type, row.title, row.body]
    );
  }
}

/* Este método marca una notificación como leída si pertenece al usuario. */
export async function markNotificationRead(id: string, userId: string): Promise<boolean> {
  const result = await query(
    `update notifications
     set read_at = coalesce(read_at, now())
     where id = $1
       and user_id = $2`,
    [id, userId]
  );

  return (result.rowCount ?? 0) > 0;
}

/* Este método marca todas las notificaciones del usuario como leídas. */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  await query(
    `update notifications
     set read_at = now()
     where user_id = $1
       and read_at is null`,
    [userId]
  );
}

/* Este método marca como leídas las notificaciones de un ticket al abrirlo. */
export async function markTicketNotificationsRead(userId: string, ticketId: string): Promise<void> {
  await query(
    `update notifications
     set read_at = now()
     where user_id = $1
       and ticket_id = $2
       and read_at is null`,
    [userId, ticketId]
  );
}
