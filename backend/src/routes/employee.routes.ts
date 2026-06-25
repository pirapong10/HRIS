import { Router } from 'express';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, getEmployeeDetails, addDoc, deleteDoc, toggleOnboardingTask } from '../controllers/employee.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, requirePermission('employee:view'), getEmployees);
router.post('/', authenticate, requirePermission('employee:create'), createEmployee);
router.get('/:id', authenticate, requirePermission('employee:view'), getEmployeeDetails);
router.put('/:id', authenticate, requirePermission('employee:edit'), updateEmployee);
router.delete('/:id', authenticate, requirePermission('employee:delete'), deleteEmployee);

router.post('/:id/docs', authenticate, requirePermission('employee:edit'), addDoc);
router.delete('/:id/docs/:docId', authenticate, requirePermission('employee:edit'), deleteDoc);
router.put('/:id/onboarding/:taskId', authenticate, requirePermission('employee:edit'), toggleOnboardingTask);

export default router;
