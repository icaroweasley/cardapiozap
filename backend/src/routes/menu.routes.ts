import { Router } from 'express';
import { getMenuBySlug } from '../controllers/menu.controller';

const router = Router();

router.get('/:slug', getMenuBySlug);

export default router;
