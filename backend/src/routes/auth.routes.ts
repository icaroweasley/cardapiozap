import { Router } from 'express';
import { register, login, getSettings, updateSettings } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);

router.get('/settings', authMiddleware, getSettings);
router.put('/settings', authMiddleware, updateSettings);

export default router;
