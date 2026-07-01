import { Router } from 'express';
import { runPayroll, getPayroll, approvePayroll, exportPayroll, getPayrollDetailById } from '../controllers/payroll.controller';
import { authenticate, requirePermission, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Run payroll (calculates tax, net, etc. for authorized scope)
// Requires PAYROLL_MANAGER or PAYROLL_OFFICER, and 'payroll:create'
router.post('/run', requirePermission('payroll:create'), runPayroll);

// Get historical payroll
router.get('/', requirePermission('payroll:view'), getPayroll);

// Get payroll detail by id
import { requireOwnershipOrScope } from '../middlewares/auth.middleware';
router.get('/details/:id', requirePermission('payroll:view'), requireOwnershipOrScope('payrollRunDetail', 'empId'), getPayrollDetailById);

// Approve payroll
router.put('/:id/approve', requirePermission('payroll:approve'), approvePayroll);

// Export payroll
router.post('/:id/export', requirePermission('payroll:export'), exportPayroll);

export default router;
