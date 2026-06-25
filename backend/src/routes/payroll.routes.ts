import { Router } from 'express';
import { runPayroll, getPayroll } from '../controllers/payroll.controller';
import { authenticate, requirePermission, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Run payroll (calculates tax, net, etc. for authorized scope)
// Requires PAYROLL_MANAGER or PAYROLL_OFFICER, and 'payroll:create'
router.post('/run', requirePermission('payroll:create'), runPayroll);

// Get historical payroll
router.get('/', requirePermission('payroll:view'), getPayroll);

export default router;
