import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/prisma';

export const getProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      where: { merchantId: req.merchantId },
      orderBy: { category: 'asc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, price, imageUrl, category, available } = req.body;
    const product = await prisma.product.create({
      data: {
        merchantId: req.merchantId!,
        name,
        description,
        price,
        imageUrl,
        category,
        available
      }
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, description, price, imageUrl, category, available } = req.body;

    // Check ownership
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.merchantId !== req.merchantId) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const product = await prisma.product.update({
      where: { id },
      data: { name, description, price, imageUrl, category, available }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    // Check ownership
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.merchantId !== req.merchantId) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    await prisma.product.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
