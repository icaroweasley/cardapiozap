"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const requireAdmin = async (req, res, next) => {
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant || !merchant.isAdmin) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    next();
};
router.get('/merchants', auth_middleware_1.authenticate, requireAdmin, async (req, res) => {
    try {
        const merchants = await prisma.merchant.findMany({
            select: {
                id: true,
                name: true,
                slug: true,
                phone: true,
                active: true,
                planStatus: true,
                planExpiresAt: true,
                createdAt: true,
                whatsappProvider: true,
                whatsappConfig: true,
                _count: {
                    select: { savedLists: true, products: true, orders: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(merchants);
    }
    catch (error) {
        res.status(500).json({ error: 'Falha ao buscar usuários' });
    }
});
router.put('/merchants/:id/plan', auth_middleware_1.authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { planStatus, planExpiresAt } = req.body;
        const updated = await prisma.merchant.update({
            where: { id },
            data: {
                planStatus,
                planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null,
            },
            select: {
                id: true,
                planStatus: true,
                planExpiresAt: true,
            }
        });
        res.json(updated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Falha ao atualizar o plano do lojista' });
    }
});
exports.default = router;
