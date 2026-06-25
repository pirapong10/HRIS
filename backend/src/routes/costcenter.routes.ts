import { Router } from 'express';
import { getCostCenters, createCostCenter } from '../controllers/costcenter.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, requirePermission('organization:view'), getCostCenters);
router.post('/', authenticate, requirePermission('organization:create'), createCostCenter);

export default router;
