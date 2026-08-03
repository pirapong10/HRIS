import { Router } from 'express';
import { runPayroll, getPayroll, approvePayroll, exportPayroll, getPayrollDetailById, generatePayslipPdf, exportSSOReport } from '../controllers/payroll.controller';
import { authenticate, requirePermission, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Run payroll (calculates tax, net, etc. for authorized scope)
// Requires PAYROLL_MANAGER or PAYROLL_OFFICER, and 'payroll:create'
router.post('/run', requirePermission('payroll:create'), runPayroll);

// Get historical payroll
router.get('/', requirePermission('payroll:view'), getPayroll);

// Export Social Security (สปส. 1-10) report
router.get('/sso-report', requirePermission('payroll:export'), exportSSOReport);

// Get payroll detail by id
import { requireOwnershipOrScope } from '../middlewares/auth.middleware';
router.get('/details/:id', requirePermission('payroll:view'), requireOwnershipOrScope('payrollRunDetail', 'empId'), getPayrollDetailById);
router.get('/details/:id/payslip-pdf', requirePermission('payroll:view'), requireOwnershipOrScope('payrollRunDetail', 'empId'), generatePayslipPdf);

// Approve payroll
router.put('/:id/approve', requirePermission('payroll:approve'), approvePayroll);

// Export payroll
router.post('/:id/export', requirePermission('payroll:export'), exportPayroll);

export default router;
