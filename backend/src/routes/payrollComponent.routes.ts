import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';
import {
  listComponents,
  createComponent,
  updateComponent,
  deleteComponent,
  testFormula,
} from '../controllers/payrollComponent.controller';

const router = Router();

// POST /test must be before /:id to avoid conflict
router.post('/test',  authenticate, requirePermission('settings:edit'),   testFormula);

router.get('/',       authenticate, requirePermission('settings:view'),   listComponents);
router.post('/',      authenticate, requirePermission('settings:create'), createComponent);
router.put('/:id',    authenticate, requirePermission('settings:edit'),   updateComponent);
router.delete('/:id', authenticate, requirePermission('settings:delete'), deleteComponent);

export default router;
