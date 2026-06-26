import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

const requireAdmin = async (req: any, res: any, next: any) => {
  const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
  if (!merchant || !merchant.isAdmin) {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

router.get('/merchants', authenticate, requireAdmin, async (req: any, res) => {
  try {
    const merchants = await prisma.merchant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        active: true,
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
  } catch (error) {
    res.status(500).json({ error: 'Falha ao buscar usuários' });
  }
});

export default router;
