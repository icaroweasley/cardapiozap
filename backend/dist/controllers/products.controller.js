"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProducts = void 0;
const prisma_1 = require("../config/prisma");
const getProducts = async (req, res) => {
    try {
        const products = await prisma_1.prisma.product.findMany({
            where: { merchantId: req.merchantId },
            include: { optionGroups: { include: { options: true } } },
            orderBy: { category: 'asc' }
        });
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getProducts = getProducts;
const createProduct = async (req, res) => {
    try {
        const { name, description, price, imageUrl, category, available, optionGroups } = req.body;
        const groupsCreate = optionGroups ? {
            create: optionGroups.map((g) => ({
                name: g.name,
                required: g.required || false,
                minChoices: g.minChoices || 0,
                maxChoices: g.maxChoices || 1,
                options: {
                    create: (g.options || []).map((o) => ({
                        name: o.name,
                        price: o.price || 0
                    }))
                }
            }))
        } : undefined;
        const product = await prisma_1.prisma.product.create({
            data: {
                merchantId: req.merchantId,
                name,
                description,
                price,
                imageUrl,
                category,
                available,
                optionGroups: groupsCreate
            },
            include: { optionGroups: { include: { options: true } } }
        });
        res.status(201).json(product);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const { name, description, price, imageUrl, category, available, optionGroups } = req.body;
        // Check ownership
        const existing = await prisma_1.prisma.product.findUnique({ where: { id } });
        if (!existing || existing.merchantId !== req.merchantId) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        if (optionGroups) {
            await prisma_1.prisma.productOptionGroup.deleteMany({ where: { productId: id } });
        }
        const groupsCreate = optionGroups ? {
            create: optionGroups.map((g) => ({
                name: g.name,
                required: g.required || false,
                minChoices: g.minChoices || 0,
                maxChoices: g.maxChoices || 1,
                options: {
                    create: (g.options || []).map((o) => ({
                        name: o.name,
                        price: o.price || 0
                    }))
                }
            }))
        } : undefined;
        const product = await prisma_1.prisma.product.update({
            where: { id },
            data: {
                name, description, price, imageUrl, category, available,
                optionGroups: groupsCreate
            },
            include: { optionGroups: { include: { options: true } } }
        });
        res.json(product);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    try {
        const id = req.params.id;
        // Check ownership
        const existing = await prisma_1.prisma.product.findUnique({ where: { id } });
        if (!existing || existing.merchantId !== req.merchantId) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        await prisma_1.prisma.product.delete({ where: { id } });
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteProduct = deleteProduct;
