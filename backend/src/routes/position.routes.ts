import { Router } from 'express';
import { getPositions, createPosition, updatePosition, deletePosition } from '../controllers/position.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, requirePermission('organization:view'), getPositions);
router.post('/', authenticate, requirePermission('organization:create'), createPosition);
router.put('/:id', authenticate, requirePermission('organization:edit'), updatePosition);
router.delete('/:id', authenticate, requirePermission('organization:delete'), deletePosition);

export default router;
