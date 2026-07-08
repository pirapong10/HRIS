import { Router } from 'express';
import { getEmployeeTypes, createEmployeeType, updateEmployeeType, deleteEmployeeType } from '../controllers/employeeType.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Settings permissions for all employee type routes
router.get('/', requirePermission('settings:view'), getEmployeeTypes);
router.post('/', requirePermission('settings:create'), createEmployeeType);
router.put('/:id', requirePermission('settings:edit'), updateEmployeeType);
router.delete('/:id', requirePermission('settings:delete'), deleteEmployeeType);

export default router;
