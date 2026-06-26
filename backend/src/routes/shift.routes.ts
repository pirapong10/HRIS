import { Router } from 'express';
import { getShiftSwaps, createShiftSwap, updateShiftSwapStatus } from '../controllers/shift.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/swaps', requirePermission('shift:view'), getShiftSwaps);
router.post('/swaps', requirePermission('shift:create'), createShiftSwap);
router.put('/swaps/:id', requirePermission('shift:approve'), updateShiftSwapStatus);

export default router;
