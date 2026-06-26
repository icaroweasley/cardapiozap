import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const getMenuBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = req.params.slug as string;

    const merchant = await prisma.merchant.findUnique({
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
    if (merchant.planExpiresAt && new Date(merchant.planExpiresAt) < new Date() && planStatus === 'active') {
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { planStatus: 'inactive' }
      });
      planStatus = 'inactive';
    }

    res.json({ ...merchant, planStatus });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
