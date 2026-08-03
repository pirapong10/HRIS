import { Router } from 'express';
import {
  getApprovalRules,
  createApprovalRule,
  updateApprovalRule,
  deleteApprovalRule,
  getDelegates,
  createDelegate
} from '../controllers/approvalRule.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Dynamic Approval Rule CRUD
router.get('/', requirePermission('settings:view'), getApprovalRules);
router.post('/', requirePermission('settings:edit'), createApprovalRule);
router.put('/:id', requirePermission('settings:edit'), updateApprovalRule);
router.delete('/:id', requirePermission('settings:edit'), deleteApprovalRule);

// Approval Delegation (Out-of-office stand-in approvers)
router.get('/delegates', getDelegates);
router.post('/delegates', createDelegate);

export default router;
