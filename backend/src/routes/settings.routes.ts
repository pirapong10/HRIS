import { Router } from 'express';
import { getSystemConfig, updateSystemConfig } from '../controllers/settings.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/config', authenticate, getSystemConfig);
router.put('/config', authenticate, requirePermission('approve_attendance'), updateSystemConfig);

export default router;
