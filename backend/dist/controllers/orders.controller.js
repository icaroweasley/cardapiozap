"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = exports.getOrders = exports.createOrder = void 0;
const prisma_1 = require("../config/prisma");
const whatsapp_service_1 = require("../services/whatsapp.service");
const createOrder = async (req, res) => {
    try {
        const { merchantId, customerName, customerPhone, deliveryType, address, paymentMethod, observation, items } = req.body;
        // Validate items and calculate total
        let totalAmount = 0;
        const orderItemsData = [];
        for (const item of items) {
            const product = await prisma_1.prisma.product.findUnique({ where: { id: item.productId } });
            if (!product || !product.available) {
                res.status(400).json({ error: `Product ${item.productId} not available` });
                return;
            }
            totalAmount += product.price * item.quantity;
            orderItemsData.push({
                productId: product.id,
                quantity: item.quantity,
                priceAtPurchase: product.price
            });
        }
        const order = await prisma_1.prisma.order.create({
            data: {
                merchantId,
                customerName,
                customerPhone,
                deliveryType,
                address,
                paymentMethod,
                observation,
                totalAmount,
                items: {
                    create: orderItemsData
                }
            },
            include: {
                items: { include: { product: true } },
                merchant: true
            }
        });
        // Fire and forget notifications
        (0, whatsapp_service_1.notifyCustomerOrderReceived)(order);
        (0, whatsapp_service_1.notifyMerchantNewOrder)(order);
        res.status(201).json(order);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createOrder = createOrder;
const getOrders = async (req, res) => {
    try {
        const orders = await prisma_1.prisma.order.findMany({
            where: { merchantId: req.merchantId },
            include: { items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getOrders = getOrders;
const updateOrderStatus = async (req, res) => {
    try {
        const id = req.params.id;
        const { status } = req.body;
        const existing = await prisma_1.prisma.order.findUnique({
            where: { id },
            include: {
                merchant: true,
                items: { include: { product: true } }
            }
        });
        if (!existing || existing.merchantId !== req.merchantId) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        const validStatuses = ['PENDING', 'PREPARING', 'SHIPPED', 'FINISHED'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ error: 'Invalid status' });
            return;
        }
        const order = await prisma_1.prisma.order.update({
            where: { id },
            data: { status },
            include: {
                merchant: true,
                items: { include: { product: true } }
            }
        });
        // Notify customer about status change
        (0, whatsapp_service_1.notifyCustomerOrderStatus)(order);
        res.json(order);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateOrderStatus = updateOrderStatus;
