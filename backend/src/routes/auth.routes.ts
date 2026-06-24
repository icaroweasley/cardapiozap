import { Router } from 'express';
import { register, login, getSettings, updateSettings } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);

router.get('/settings', authenticate, getSettings);
router.put('/settings', authenticate, updateSettings);

export default router;
