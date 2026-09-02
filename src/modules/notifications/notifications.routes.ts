import { Router } from 'express';

import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../shared/http/async-handler';
import {
  handleListNotifications,
  handleMarkAllNotificationsRead,
  handleMarkNotificationRead
} from './notifications.controller';

export const notificationsRoutes = Router();

notificationsRoutes.use(authenticate);
notificationsRoutes.get('/', asyncHandler(handleListNotifications));
notificationsRoutes.post('/read-all', asyncHandler(handleMarkAllNotificationsRead));
notificationsRoutes.patch('/:id/read', asyncHandler(handleMarkNotificationRead));
