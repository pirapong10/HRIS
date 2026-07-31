import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';
import { getMappings, updateMapping } from '../controllers/payrollConfig.controller';

const router = Router();

router.get('/mappings', authenticate, requirePermission('payroll:view'), getMappings);
router.post('/mappings', authenticate, requirePermission('payroll:edit'), updateMapping);

export default router;
