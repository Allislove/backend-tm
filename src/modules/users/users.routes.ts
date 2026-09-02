import { Router } from 'express';

import { authenticate, authorize } from '../../middleware/auth';
import { asyncHandler } from '../../shared/http/async-handler';
import { handleCreateUser, handleListUsers, handleUpdateUser } from './users.controller';

export const usersRoutes = Router();

usersRoutes.use(authenticate);
usersRoutes.get('/', asyncHandler(handleListUsers));
usersRoutes.post('/', authorize('admin'), asyncHandler(handleCreateUser));
usersRoutes.patch('/:id', authorize('admin'), asyncHandler(handleUpdateUser));
