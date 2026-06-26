import { Router } from 'express';
import { getOTs, createOT, updateOTStatus } from '../controllers/ot.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('attendance:view'), getOTs);
router.post('/', requirePermission('attendance:create'), createOT);
router.put('/:id/approve', requirePermission('attendance:approve'), updateOTStatus);

export default router;
