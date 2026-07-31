import { Router } from 'express';
import { getLeavePolicies, recalculateLeaveBalances, updateLeavePolicy, getProbationPolicy, updateProbationPolicy } from '../controllers/leave-policy.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, requirePermission('leave:view'), getLeavePolicies);
router.put('/:id', authenticate, requirePermission('leave:approve'), updateLeavePolicy);
router.get('/probation', authenticate, requirePermission('leave:view'), getProbationPolicy);
router.put('/probation/:id', authenticate, requirePermission('leave:approve'), updateProbationPolicy);
router.post('/recalculate', authenticate, requirePermission('leave:approve'), recalculateLeaveBalances);

export default router;
