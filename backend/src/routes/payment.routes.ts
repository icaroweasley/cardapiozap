import { Router } from 'express';
import { createCheckout, handleWebhook } from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/checkout', authenticate, createCheckout);
router.post('/webhook', handleWebhook);

export default router;
