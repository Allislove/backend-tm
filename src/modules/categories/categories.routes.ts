import { Router } from 'express';

import { authenticate, authorize } from '../../middleware/auth';
import { asyncHandler } from '../../shared/http/async-handler';
import { handleCreateCategory, handleListCategories, handleUpdateCategory } from './categories.controller';

export const categoriesRoutes = Router();

categoriesRoutes.use(authenticate);
categoriesRoutes.get('/', asyncHandler(handleListCategories));
categoriesRoutes.post('/', authorize('admin'), asyncHandler(handleCreateCategory));
categoriesRoutes.patch('/:id', authorize('admin'), asyncHandler(handleUpdateCategory));
