"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProducts = void 0;
const prisma_1 = require("../config/prisma");
const getProducts = async (req, res) => {
    try {
        const products = await prisma_1.prisma.product.findMany({
            where: { merchantId: req.merchantId },
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
        const { name, description, price, imageUrl, category, available } = req.body;
        const product = await prisma_1.prisma.product.create({
            data: {
                merchantId: req.merchantId,
                name,
                description,
                price,
                imageUrl,
                category,
                available
            }
        });
        res.status(201).json(product);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const { name, description, price, imageUrl, category, available } = req.body;
        // Check ownership
        const existing = await prisma_1.prisma.product.findUnique({ where: { id } });
        if (!existing || existing.merchantId !== req.merchantId) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        const product = await prisma_1.prisma.product.update({
            where: { id },
            data: { name, description, price, imageUrl, category, available }
        });
        res.json(product);
    }
    catch (error) {
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
