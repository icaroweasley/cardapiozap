"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.getSettings = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const register = async (req, res) => {
    try {
        const { name, slug, phone, password } = req.body;
        const existingMerchant = await prisma_1.prisma.merchant.findUnique({ where: { slug } });
        if (existingMerchant) {
            res.status(400).json({ error: 'Slug already in use' });
            return;
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const merchant = await prisma_1.prisma.merchant.create({
            data: {
                name,
                slug,
                phone,
                password: hashedPassword,
            },
        });
        const token = jsonwebtoken_1.default.sign({ id: merchant.id }, process.env.JWT_SECRET || 'secret', {
            expiresIn: '7d',
        });
        res.status(201).json({ token, merchant: { id: merchant.id, name: merchant.name, slug: merchant.slug, isAdmin: merchant.isAdmin } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { slug, password } = req.body;
        const merchant = await prisma_1.prisma.merchant.findUnique({ where: { slug } });
        if (!merchant) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const isMatch = await bcrypt_1.default.compare(password, merchant.password);
        if (!isMatch) {
            res.status(401).json({ error: 'Invalid credentials' });
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
        const token = jsonwebtoken_1.default.sign({ id: merchant.id }, process.env.JWT_SECRET || 'secret', {
            expiresIn: '7d',
        });
        res.json({ token, merchant: { id: merchant.id, name: merchant.name, slug: merchant.slug, isAdmin: merchant.isAdmin, planStatus, planExpiresAt: merchant.planExpiresAt } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.login = login;
const getSettings = async (req, res) => {
    try {
        const merchant = await prisma_1.prisma.merchant.findUnique({
            where: { id: req.merchantId }
        });
        if (!merchant) {
            res.status(404).json({ error: 'Merchant not found' });
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
        res.json({
            whatsappProvider: merchant.whatsappProvider,
            whatsappConfig: merchant.whatsappConfig ? JSON.parse(merchant.whatsappConfig) : null,
            isAdmin: merchant.isAdmin,
            planStatus,
            planExpiresAt: merchant.planExpiresAt
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getSettings = getSettings;
const updateSettings = async (req, res) => {
    try {
        const { whatsappProvider, whatsappConfig } = req.body;
        const merchant = await prisma_1.prisma.merchant.update({
            where: { id: req.merchantId },
            data: {
                whatsappProvider,
                whatsappConfig: whatsappConfig ? JSON.stringify(whatsappConfig) : null
            }
        });
        res.json({
            whatsappProvider: merchant.whatsappProvider,
            whatsappConfig: merchant.whatsappConfig ? JSON.parse(merchant.whatsappConfig) : null
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateSettings = updateSettings;
