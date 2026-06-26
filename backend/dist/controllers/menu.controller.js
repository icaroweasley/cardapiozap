"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMenuBySlug = void 0;
const prisma_1 = require("../config/prisma");
const getMenuBySlug = async (req, res) => {
    try {
        const slug = req.params.slug;
        const merchant = await prisma_1.prisma.merchant.findUnique({
            where: { slug },
            select: {
                id: true,
                name: true,
                phone: true,
                planStatus: true,
                planExpiresAt: true,
                products: {
                    where: { available: true },
                    orderBy: { category: 'asc' }
                }
            }
        });
        if (!merchant) {
            res.status(404).json({ error: 'Menu not found' });
            return;
        }
        let planStatus = merchant.planStatus;
        if (merchant.planExpiresAt && planStatus === 'active') {
            const gracePeriodMs = 3 * 24 * 60 * 60 * 1000;
            if (new Date(merchant.planExpiresAt).getTime() + gracePeriodMs < new Date().getTime()) {
                await prisma_1.prisma.merchant.update({
                    where: { id: merchant.id },
                    data: { planStatus: 'inactive' }
                });
                planStatus = 'inactive';
            }
        }
        res.json({ ...merchant, planStatus });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMenuBySlug = getMenuBySlug;
