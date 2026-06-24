import { Router } from 'express';
import { createOrder, updateOrderStatus, getOrders } from '../controllers/orders.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Public endpoint for customers to place orders
router.post('/', createOrder);

// Protected endpoints for merchants
router.use(authenticate);
router.get('/', getOrders);
router.patch('/:id/status', updateOrderStatus);

export default router;
