import { Request, Response } from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

// Initialize MP Config (if the token is absent it will fail on call, handled in try/catch)
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });

export const createCheckout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) { res.status(404).json({ error: 'Merchant not found' }); return; }

    if (!process.env.MP_ACCESS_TOKEN) {
      res.status(500).json({ error: 'Mercado Pago não configurado no servidor' });
      return;
    }

    const preference = new Preference(client);
    
    // Configure redirect and webhook urls
    // For localhost testing, you might need a tunnel like ngrok for the webhook.
    const host = process.env.FRONTEND_URL || 'http://localhost:5173';
    // WEBHOOK_URL should be the public backend URL 
    const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3001';

    const response = await preference.create({
      body: {
        items: [
          {
            id: 'vanguard_monthly',
            title: 'Assinatura Mensal - ZapGarçom',
            quantity: 1,
            unit_price: merchant.subscriptionPrice || 49.90,
            currency_id: 'BRL',
          }
        ],
        metadata: {
          merchant_id: merchantId
        },
        notification_url: `${webhookUrl}/api/payment/webhook`,
        back_urls: {
          success: `${host}/dashboard?payment=success`,
          failure: `${host}/dashboard?payment=failure`,
          pending: `${host}/dashboard?payment=pending`
        },
        auto_return: 'approved'
      }
    });

    // Send back the init_point (checkout URL)
    res.json({ init_point: response.init_point });
  } catch (error) {
    console.error('Error creating MP checkout', error);
    res.status(500).json({ error: 'Failed to create checkout' });
  }
};

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentId = req.query.id || req.query['data.id'] || req.body?.data?.id;

    if (!paymentId) {
       res.status(400).send('No payment id');
       return;
    }

    const payment = new Payment(client);
    const paymentInfo = await payment.get({ id: paymentId.toString() });

    if (paymentInfo.status === 'approved') {
       const merchantId = paymentInfo.metadata?.merchant_id;
       if (merchantId) {
          const now = new Date();
          const nextMonth = new Date(now.setMonth(now.getMonth() + 1));
          
          await prisma.merchant.update({
            where: { id: merchantId },
            data: {
              planStatus: 'active',
              planExpiresAt: nextMonth,
              isTrial: false
            }
          });
          console.log(`[Mercado Pago] Assinatura renovada para Merchant ID: ${merchantId}. Vence em: ${nextMonth.toISOString()}`);
       }
    }
    
    // Always return 200 OK so MP stops sending the webhook
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling webhook', error);
    // If we return 500, MP will retry later
    res.status(500).send('Error processing webhook');
  }
};
