import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, slug, phone, password } = req.body;

    const existingMerchant = await prisma.merchant.findUnique({ where: { slug } });
    if (existingMerchant) {
      res.status(400).json({ error: 'Slug already in use' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const merchant = await prisma.merchant.create({
      data: {
        name,
        slug,
        phone,
        password: hashedPassword,
      },
    });

    const token = jwt.sign({ id: merchant.id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '7d',
    });

    res.status(201).json({ token, merchant: { id: merchant.id, name: merchant.name, slug: merchant.slug, isAdmin: merchant.isAdmin } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, password } = req.body;

    const merchant = await prisma.merchant.findUnique({ where: { slug } });
    if (!merchant) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, merchant.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
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

    const token = jwt.sign({ id: merchant.id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '7d',
    });

    res.json({ token, merchant: { id: merchant.id, name: merchant.name, slug: merchant.slug, isAdmin: merchant.isAdmin, planStatus, planExpiresAt: merchant.planExpiresAt } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

import { AuthRequest } from '../middlewares/auth.middleware';

export const getSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchantId }
    });
    
    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found' });
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

    res.json({
      whatsappProvider: merchant.whatsappProvider,
      whatsappConfig: merchant.whatsappConfig ? JSON.parse(merchant.whatsappConfig) : null,
      isAdmin: merchant.isAdmin,
      planStatus,
      planExpiresAt: merchant.planExpiresAt
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { whatsappProvider, whatsappConfig } = req.body;
    
    const merchant = await prisma.merchant.update({
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
