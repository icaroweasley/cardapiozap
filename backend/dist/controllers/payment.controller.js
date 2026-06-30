"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhook = exports.createCheckout = void 0;
const mercadopago_1 = require("mercadopago");
const prisma_1 = require("../config/prisma");
// Initialize MP Config (if the token is absent it will fail on call, handled in try/catch)
const client = new mercadopago_1.MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });
const createCheckout = async (req, res) => {
    try {
        const merchantId = req.merchantId;
        if (!merchantId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        if (!process.env.MP_ACCESS_TOKEN) {
            res.status(500).json({ error: 'Mercado Pago não configurado no servidor' });
            return;
        }
        const preference = new mercadopago_1.Preference(client);
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
                        unit_price: 49.90,
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
    }
    catch (error) {
        console.error('Error creating MP checkout', error);
        res.status(500).json({ error: 'Failed to create checkout' });
    }
};
exports.createCheckout = createCheckout;
const handleWebhook = async (req, res) => {
    try {
        const paymentId = req.query.id || req.query['data.id'] || req.body?.data?.id;
        if (!paymentId) {
            res.status(400).send('No payment id');
            return;
        }
        const payment = new mercadopago_1.Payment(client);
        const paymentInfo = await payment.get({ id: paymentId.toString() });
        if (paymentInfo.status === 'approved') {
            const merchantId = paymentInfo.metadata?.merchant_id;
            if (merchantId) {
                const now = new Date();
                const nextMonth = new Date(now.setMonth(now.getMonth() + 1));
                await prisma_1.prisma.merchant.update({
                    where: { id: merchantId },
                    data: {
                        planStatus: 'active',
                        planExpiresAt: nextMonth
                    }
                });
                console.log(`[Mercado Pago] Assinatura renovada para Merchant ID: ${merchantId}. Vence em: ${nextMonth.toISOString()}`);
            }
        }
        // Always return 200 OK so MP stops sending the webhook
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('Error handling webhook', error);
        // If we return 500, MP will retry later
        res.status(500).send('Error processing webhook');
    }
};
exports.handleWebhook = handleWebhook;
