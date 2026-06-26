import { Router } from 'express';
import { login, getMe, logout, refresh } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per `window` (here, per 15 minutes)
  message: { message: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);

export default router;
