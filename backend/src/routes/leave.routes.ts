import { Router } from 'express';
import { getLeaves, createLeave } from '../controllers/leave.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, requirePermission('leave:view'), getLeaves);
router.post('/', authenticate, requirePermission('leave:create'), createLeave);

export default router;
