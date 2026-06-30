"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.post('/checkout', auth_middleware_1.authenticate, payment_controller_1.createCheckout);
router.post('/webhook', payment_controller_1.handleWebhook);
exports.default = router;
