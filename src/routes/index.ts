import { Router } from 'express';

import { authRoutes } from '../modules/auth/auth.routes';
import { categoriesRoutes } from '../modules/categories/categories.routes';
import { clientsRoutes } from '../modules/clients/clients.routes';
import { dashboardRoutes } from '../modules/dashboard/dashboard.routes';
import { notificationsRoutes } from '../modules/notifications/notifications.routes';
import { ticketsRoutes } from '../modules/tickets/tickets.routes';
import { usersRoutes } from '../modules/users/users.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/clients', clientsRoutes);
apiRouter.use('/categories', categoriesRoutes);
apiRouter.use('/tickets', ticketsRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/notifications', notificationsRoutes);
