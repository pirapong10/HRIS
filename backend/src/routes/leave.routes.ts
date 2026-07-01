import { Router } from 'express';
import { getLeaves, getLeaveById, createLeave } from '../controllers/leave.controller';
import { authenticate, requirePermission, requireOwnershipOrScope } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, requirePermission('leave:view'), getLeaves);
router.get('/:id', authenticate, requirePermission('leave:view'), requireOwnershipOrScope('leave', 'empId'), getLeaveById);
router.post('/', authenticate, requirePermission('leave:create'), createLeave);

export default router;
