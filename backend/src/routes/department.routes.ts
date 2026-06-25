import { Router } from 'express';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/department.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, requirePermission('organization:view'), getDepartments);
router.post('/', authenticate, requirePermission('organization:create'), createDepartment);
router.put('/:id', authenticate, requirePermission('organization:edit'), updateDepartment);
router.delete('/:id', authenticate, requirePermission('organization:delete'), deleteDepartment);

export default router;
