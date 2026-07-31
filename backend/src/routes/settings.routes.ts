import { Router } from 'express';
import { getSystemConfig, updateSystemConfig } from '../controllers/settings.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/config', getSystemConfig);
router.put('/config', authenticate, requirePermission('settings:edit'), updateSystemConfig);

export default router;
