"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orders_controller_1 = require("../controllers/orders.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Public endpoint for customers to place orders
router.post('/', orders_controller_1.createOrder);
// Protected endpoints for merchants
router.use(auth_middleware_1.authenticate);
router.get('/', orders_controller_1.getOrders);
router.patch('/:id/status', orders_controller_1.updateOrderStatus);
exports.default = router;
