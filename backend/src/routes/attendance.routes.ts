import { Router } from 'express';
import { getAttendance, clockIn, clockOut, getTodayStatus, getCorrections, createCorrection, approveCorrection, exportAttendance, checkIn } from '../controllers/attendance.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';
import { uploadAttendancePhoto } from '../middlewares/upload.middleware';

const router = Router();

router.get('/', authenticate, requirePermission('attendance:view'), getAttendance);
router.post('/clock-in', authenticate, requirePermission('attendance:create'), clockIn);
router.post('/clock-out', authenticate, requirePermission('attendance:create'), clockOut);
router.post('/check-in', authenticate, requirePermission('attendance:create'), uploadAttendancePhoto.single('photo'), checkIn);

router.get('/today', authenticate, requirePermission('attendance:view'), getTodayStatus);
router.get('/corrections', authenticate, requirePermission('attendance:view'), getCorrections);
router.post('/corrections', authenticate, requirePermission('attendance:create'), createCorrection);
router.put('/corrections/:id/approve', authenticate, requirePermission('attendance:approve'), approveCorrection);

router.get('/export/excel', authenticate, requirePermission('attendance:export'), exportAttendance);

export default router;
