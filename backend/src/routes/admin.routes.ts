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
        planStatus: true,
        planExpiresAt: true,
        createdAt: true,
        whatsappProvider: true,
        whatsappConfig: true,
        accountType: true,
        subscriptionPrice: true,
        isTrial: true,
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

router.put('/merchants/:id/plan', authenticate, requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { planStatus, planExpiresAt, accountType, subscriptionPrice, isTrial } = req.body;

    const data: any = {
      planStatus,
      planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null,
    };
    if (accountType) {
      data.accountType = accountType;
    }
    if (subscriptionPrice !== undefined) {
      data.subscriptionPrice = Number(subscriptionPrice);
    }
    if (isTrial !== undefined) {
      data.isTrial = isTrial;
    }

    const updated = await prisma.merchant.update({
      where: { id },
      data,
      select: {
        id: true,
        planStatus: true,
        planExpiresAt: true,
        accountType: true,
        subscriptionPrice: true,
        isTrial: true,
      }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao atualizar o plano do lojista' });
  }
});

export default router;
