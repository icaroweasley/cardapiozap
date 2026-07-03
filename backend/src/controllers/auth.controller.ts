import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, slug, phone, password, accountType } = req.body;

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
        accountType: accountType || 'FULL',
        isTrial: true,
        planExpiresAt: new Date(Date.now() + (parseInt(process.env.DEFAULT_TRIAL_DAYS || '3') * 24 * 60 * 60 * 1000)),
      },
    });

    const token = jwt.sign({ id: merchant.id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '7d',
    });

    res.status(201).json({ token, merchant: { id: merchant.id, name: merchant.name, slug: merchant.slug, isAdmin: merchant.isAdmin, accountType: merchant.accountType } });
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
    if (merchant.planExpiresAt && planStatus === 'active') {
      const gracePeriodMs = 3 * 24 * 60 * 60 * 1000;
      if (new Date(merchant.planExpiresAt).getTime() + gracePeriodMs < new Date().getTime()) {
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: { planStatus: 'inactive' }
        });
        planStatus = 'inactive';
      }
    }

    const token = jwt.sign({ id: merchant.id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '7d',
    });

    res.json({ token, merchant: { id: merchant.id, name: merchant.name, slug: merchant.slug, phone: merchant.phone, logoUrl: merchant.logoUrl, isAdmin: merchant.isAdmin, planStatus, planExpiresAt: merchant.planExpiresAt, accountType: merchant.accountType } });
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
    if (merchant.planExpiresAt && planStatus === 'active') {
      const gracePeriodMs = 3 * 24 * 60 * 60 * 1000;
      if (new Date(merchant.planExpiresAt).getTime() + gracePeriodMs < new Date().getTime()) {
        await prisma.merchant.update({
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
      themeConfig: merchant.themeConfig ? JSON.parse(merchant.themeConfig) : null,
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

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, slug, phone, password, logoUrl, deliveryFee, minOrderValue, businessHours, address, paymentMethods, themeConfig } = req.body;
    
    if (slug) {
      const existing = await prisma.merchant.findUnique({ where: { slug } });
      if (existing && existing.id !== req.merchantId) {
        res.status(400).json({ error: 'Este slug/URL já está em uso.' });
        return;
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (phone) updateData.phone = phone;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (deliveryFee !== undefined) updateData.deliveryFee = deliveryFee;
    if (minOrderValue !== undefined) updateData.minOrderValue = minOrderValue;
    if (businessHours !== undefined) updateData.businessHours = businessHours;
    if (address !== undefined) updateData.address = address;
    if (paymentMethods !== undefined) updateData.paymentMethods = paymentMethods;
    if (themeConfig !== undefined) updateData.themeConfig = typeof themeConfig === 'string' ? themeConfig : JSON.stringify(themeConfig);
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const merchant = await prisma.merchant.update({
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
      themeConfig: merchant.themeConfig ? JSON.parse(merchant.themeConfig) : null,
      isAdmin: merchant.isAdmin
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
