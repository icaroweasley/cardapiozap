import { Router } from 'express';
import { register, login, getSettings, updateSettings, updateProfile } from '../controllers/auth.controller';
import { getEvolutionState, createEvolutionInstance, deleteEvolutionInstance } from '../controllers/evolution.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);

router.get('/settings', authenticate, getSettings);
router.put('/settings', authenticate, updateSettings);
router.put('/profile', authenticate, updateProfile);

router.get('/evolution/instance/:instanceName', authenticate, getEvolutionState);
router.post('/evolution/instance', authenticate, createEvolutionInstance);
router.delete('/evolution/instance/:instanceName', authenticate, deleteEvolutionInstance);

export default router;
