import { Router } from 'express';
import { generateMfa, verifyAndEnableMfa, disableMfa } from '../controllers/mfa.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/generate', generateMfa);
router.post('/verify', verifyAndEnableMfa);
router.post('/disable', disableMfa);

export default router;
