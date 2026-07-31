import { Router } from 'express';
import {
  getPublicHolidays,
  createPublicHoliday,
  updatePublicHoliday,
  deletePublicHoliday,
} from '../controllers/public-holiday.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// Require authentication for all routes
router.use(authenticate);

// Everyone authenticated can view holidays
router.get('/', getPublicHolidays);

// Only authorized roles can manage holidays
router.post('/', requirePermission('settings:create'), createPublicHoliday);
router.put('/:id', requirePermission('settings:edit'), updatePublicHoliday);
router.delete('/:id', requirePermission('settings:delete'), deletePublicHoliday);

export default router;
