import type { Request, Response } from 'express';

import { requireAuthUser } from '../../middleware/auth';
import { notificationsService } from './notifications.service';

/* Este método responde con las notificaciones del usuario autenticado. */
export async function handleListNotifications(request: Request, response: Response) {
  const authUser = requireAuthUser(request);
  const result = await notificationsService.list(authUser.userId);
  response.json(result);
}

/* Este método marca una notificación como leída. */
export async function handleMarkNotificationRead(request: Request, response: Response) {
  const authUser = requireAuthUser(request);
  const result = await notificationsService.markRead(String(request.params.id), authUser.userId);
  response.json(result);
}

/* Este método marca todas las notificaciones del usuario como leídas. */
export async function handleMarkAllNotificationsRead(request: Request, response: Response) {
  const authUser = requireAuthUser(request);
  const result = await notificationsService.markAllRead(authUser.userId);
  response.json(result);
}
