import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';
import {
  getHeadcounts,
  getHeadcountById,
  createHeadcount,
  approveHeadcount,
  deleteHeadcount,
} from '../controllers/headcount.controller';

const router = Router();

router.use(authenticate);

// Static sub-routes BEFORE /:id
router.get('/',    requirePermission('headcount:view'),   getHeadcounts);
router.post('/',   requirePermission('headcount:create'), createHeadcount);

// Parameterised routes
router.get('/:id',         requirePermission('headcount:view'),   getHeadcountById);
router.put('/:id/approve', requirePermission('headcount:approve'), approveHeadcount);
router.delete('/:id',      requirePermission('headcount:delete'),  deleteHeadcount);

export default router;
