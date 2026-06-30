"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.updateSettings = exports.getSettings = exports.login = exports.register = void 0;
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
                planExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days free trial
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
        res.json({ token, merchant: { id: merchant.id, name: merchant.name, slug: merchant.slug, phone: merchant.phone, logoUrl: merchant.logoUrl, isAdmin: merchant.isAdmin, planStatus, planExpiresAt: merchant.planExpiresAt } });
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
            name: merchant.name,
            slug: merchant.slug,
            phone: merchant.phone,
            logoUrl: merchant.logoUrl,
            deliveryFee: merchant.deliveryFee,
            minOrderValue: merchant.minOrderValue,
            businessHours: merchant.businessHours,
            address: merchant.address,
            paymentMethods: merchant.paymentMethods,
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
const updateProfile = async (req, res) => {
    try {
        const { name, slug, phone, password, logoUrl, deliveryFee, minOrderValue, businessHours, address, paymentMethods } = req.body;
        if (slug) {
            const existing = await prisma_1.prisma.merchant.findUnique({ where: { slug } });
            if (existing && existing.id !== req.merchantId) {
                res.status(400).json({ error: 'Este slug/URL já está em uso.' });
                return;
            }
        }
        const updateData = {};
        if (name)
            updateData.name = name;
        if (slug)
            updateData.slug = slug;
        if (phone)
            updateData.phone = phone;
        if (logoUrl !== undefined)
            updateData.logoUrl = logoUrl;
        if (deliveryFee !== undefined)
            updateData.deliveryFee = deliveryFee;
        if (minOrderValue !== undefined)
            updateData.minOrderValue = minOrderValue;
        if (businessHours !== undefined)
            updateData.businessHours = businessHours;
        if (address !== undefined)
            updateData.address = address;
        if (paymentMethods !== undefined)
            updateData.paymentMethods = paymentMethods;
        if (password) {
            updateData.password = await bcrypt_1.default.hash(password, 10);
        }
        const merchant = await prisma_1.prisma.merchant.update({
            where: { id: req.merchantId },
            data: updateData
        });
        res.json({
            id: merchant.id,
            name: merchant.name,
            slug: merchant.slug,
            phone: merchant.phone,
            logoUrl: merchant.logoUrl,
            deliveryFee: merchant.deliveryFee,
            minOrderValue: merchant.minOrderValue,
            businessHours: merchant.businessHours,
            address: merchant.address,
            paymentMethods: merchant.paymentMethods,
            isAdmin: merchant.isAdmin
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateProfile = updateProfile;
