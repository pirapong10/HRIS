import { Router } from 'express';
import {
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  getEmployeeLeaveAccounts,
  assignLeavePolicyToEmployee,
  revokeLeavePolicyFromEmployee,
  manualBalanceAdjustment,
  reconcileEmployee
} from '../controllers/admin-leave.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// ── Leave Type Definitions ──────────────────────────────────────
router.get('/leave-types', getLeaveTypes);
router.post('/leave-types', requirePermission('settings:view'), createLeaveType);
router.put('/leave-types/:id', requirePermission('settings:view'), updateLeaveType);
router.delete('/leave-types/:id', requirePermission('settings:view'), deleteLeaveType);

// ── Employee Leave Account Assignment ───────────────────────────
router.get('/employees/:empId/leave-accounts', getEmployeeLeaveAccounts);
router.post('/employees/:empId/leave-accounts', requirePermission('leave:approve'), assignLeavePolicyToEmployee);
router.put('/leave-accounts/:accountId/revoke', requirePermission('leave:approve'), revokeLeavePolicyFromEmployee);

// ── Manual Balance Adjustment (Ledger-Safe) ─────────────────────
router.post('/leave-accounts/:accountId/adjust', requirePermission('leave:approve'), manualBalanceAdjustment);

// ── Reconciliation Trigger ──────────────────────────────────────
router.post('/employees/:empId/reconcile', requirePermission('leave:approve'), reconcileEmployee);

export default router;
