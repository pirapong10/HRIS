import { Router } from 'express';
import { getPendingApprovals, updateApprovalStatus } from '../controllers/approvals.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Retrieve all pending approvals for the manager
router.get('/pending', authenticate, getPendingApprovals);

// Update approval status (Approve / Reject)
router.put('/:id/status', authenticate, updateApprovalStatus);

export default router;
