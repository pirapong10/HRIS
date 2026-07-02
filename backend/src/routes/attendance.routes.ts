import { Router } from 'express';
import { getAttendance, clockIn, clockOut, getTodayStatus, getCorrections, createCorrection, approveCorrection } from '../controllers/attendance.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, requirePermission('attendance:view'), getAttendance);
router.post('/clock-in', authenticate, requirePermission('attendance:create'), clockIn);
router.post('/clock-out', authenticate, requirePermission('attendance:create'), clockOut);

router.get('/today', authenticate, requirePermission('attendance:view'), getTodayStatus);
router.get('/corrections', authenticate, requirePermission('attendance:view'), getCorrections);
router.post('/corrections', authenticate, requirePermission('attendance:create'), createCorrection);
router.put('/corrections/:id/approve', authenticate, requirePermission('attendance:approve'), approveCorrection);

export default router;
