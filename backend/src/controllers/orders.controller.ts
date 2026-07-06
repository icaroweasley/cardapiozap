import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/prisma';
import { notifyCustomerOrderReceived, notifyMerchantNewOrder, notifyCustomerOrderStatus } from '../services/whatsapp.service';
import { io } from '../index';

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId, customerName, customerPhone, deliveryType, address, paymentMethod, observation, items } = req.body;

    // Validate items and calculate total
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.available) {
        res.status(400).json({ error: `Product ${item.productId} not available` });
        return;
      }
      
      let itemPrice = product.price;
      let optionsPayload: any = null;
      if (item.options && Array.isArray(item.options)) {
        optionsPayload = JSON.stringify(item.options);
        item.options.forEach((opt: any) => {
          if (opt.price) itemPrice += opt.price;
        });
      }
      
      totalAmount += itemPrice * item.quantity;
      orderItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        priceAtPurchase: itemPrice,
        options: optionsPayload
      });
    }

    if (deliveryType === 'DELIVERY') {
      totalAmount += 500; // Taxa de entrega (R$ 5,00 mock)
    }

    const order = await prisma.order.create({
      data: {
        merchantId,
        customerName,
        customerPhone,
        deliveryType,
        address,
        paymentMethod,
        observation,
        totalAmount,
        items: {
          create: orderItemsData
        }
      },
      include: {
        items: { include: { product: true } },
        merchant: true
      }
    });

    // Notify connected frontend clients
    io.to(merchantId).emit('new-order', order);

    // Fire and forget notifications
    notifyCustomerOrderReceived(order);
    notifyMerchantNewOrder(order);

    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await prisma.order.findMany({
      where: { merchantId: req.merchantId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const existing = await prisma.order.findUnique({
      where: { id },
      include: {
        merchant: true,
        items: { include: { product: true } }
      }
    });

    if (!existing || existing.merchantId !== req.merchantId) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const validStatuses: string[] = ['PENDING', 'PREPARING', 'SHIPPED', 'FINISHED', 'CANCELED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        merchant: true,
        items: { include: { product: true } }
      }
    });

    // Notify customer about status change
    notifyCustomerOrderStatus(order);

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
