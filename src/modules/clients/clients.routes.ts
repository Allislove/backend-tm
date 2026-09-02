import { Router } from 'express';

import { authenticate, authorize } from '../../middleware/auth';
import { asyncHandler } from '../../shared/http/async-handler';
import {
  handleCreateClient,
  handleGetClient,
  handleListClients,
  handleUpdateClient
} from './clients.controller';

export const clientsRoutes = Router();

clientsRoutes.use(authenticate);
clientsRoutes.get('/', asyncHandler(handleListClients));
clientsRoutes.get('/:id', authorize('admin', 'supervisor'), asyncHandler(handleGetClient));
clientsRoutes.post('/', authorize('admin'), asyncHandler(handleCreateClient));
clientsRoutes.patch('/:id', authorize('admin'), asyncHandler(handleUpdateClient));
