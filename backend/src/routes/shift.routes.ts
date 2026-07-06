import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';
import {
  getShifts, createShift, updateShift, deleteShift,
  getShiftSwaps, createShiftSwap, updateShiftSwapStatus
} from '../controllers/shift.controller';

const router = Router();

// Shift Swaps — must come BEFORE /:id to avoid conflict
router.get('/swaps',     authenticate, requirePermission('shift:view'),    getShiftSwaps);
router.post('/swaps',    authenticate, requirePermission('shift:create'),  createShiftSwap);
router.put('/swaps/:id', authenticate, requirePermission('shift:approve'), updateShiftSwapStatus);

// Shift CRUD
router.get('/',     authenticate, requirePermission('shift:view'),   getShifts);
router.post('/',    authenticate, requirePermission('shift:create'), createShift);
router.put('/:id',  authenticate, requirePermission('shift:edit'),   updateShift);
router.delete('/:id', authenticate, requirePermission('shift:delete'), deleteShift);

export default router;
