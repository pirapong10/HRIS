import { Router } from 'express';
import { getRequests, createRequest, approveRequest } from '../controllers/approval.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, requirePermission('leave:view'), getRequests);
router.post('/', authenticate, requirePermission('leave:create'), createRequest);
router.post('/:id/approve', authenticate, requirePermission('leave:approve'), approveRequest);

export default router;
