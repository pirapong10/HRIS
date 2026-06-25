import { Router } from 'express';
import { getAttendance, clockIn, clockOut } from '../controllers/attendance.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, requirePermission('attendance:view'), getAttendance);
router.post('/clock-in', authenticate, requirePermission('attendance:create'), clockIn);
router.post('/clock-out', authenticate, requirePermission('attendance:create'), clockOut);

export default router;
