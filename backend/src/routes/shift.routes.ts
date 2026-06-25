import { Router } from 'express';
import { getShiftSwaps, createShiftSwap, updateShiftSwapStatus } from '../controllers/shift.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/swaps', getShiftSwaps);
router.post('/swaps', createShiftSwap);
router.put('/swaps/:id', updateShiftSwapStatus);

export default router;
