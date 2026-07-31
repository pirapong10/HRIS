import { Router } from 'express';
import { getMyLeaves, createLeave, getPendingApprovals, approveLeave, getMyLeaveBalance } from '../controllers/leave.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';
import { uploadLeaveCert } from '../middlewares/upload.middleware';

const router = Router();

router.use(authenticate);

// ESS Routes (Employee Self-Service)
router.get('/balance', requirePermission('leave:view'), getMyLeaveBalance);
router.get('/my-requests', requirePermission('leave:view'), getMyLeaves);
router.post('/', requirePermission('leave:create'), uploadLeaveCert.single('medicalCert'), createLeave);

// Manager/Admin Approval Routes
router.get('/approvals', requirePermission('leave:approve'), getPendingApprovals);
router.put('/approvals/:id', requirePermission('leave:approve'), approveLeave);

export default router;
