import { Router } from 'express';
import { getOTs, getOTById, createOT, updateOTStatus } from '../controllers/ot.controller';
import { authenticate, requirePermission, requireOwnershipOrScope } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('attendance:view'), getOTs);
router.get('/:id', requirePermission('attendance:view'), requireOwnershipOrScope('oT', 'empId'), getOTById);
router.post('/', requirePermission('attendance:create'), createOT);
router.put('/:id/approve', requirePermission('attendance:approve'), updateOTStatus);

export default router;
