"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyCustomerOrderStatus = exports.notifyMerchantNewOrder = exports.notifyCustomerOrderReceived = exports.sendWhatsAppMessage = void 0;
const axios_1 = __importDefault(require("axios"));
const formatCurrency = (cents) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
const sendWhatsAppMessage = async (merchant, phone, text) => {
    try {
        const provider = merchant.whatsappProvider || 'EVOLUTION';
        let config = {};
        if (merchant.whatsappConfig) {
            try {
                config = JSON.parse(merchant.whatsappConfig);
            }
            catch (e) {
                console.error('Failed to parse merchant whatsappConfig', e);
            }
        }
        // Clean phone number (keep only digits)
        const cleanPhone = phone.replace(/\D/g, '');
        if (provider === 'OFFICIAL') {
            // Official Meta Cloud API
            const phoneNumberId = config.phoneNumberId;
            const accessToken = config.accessToken;
            if (!phoneNumberId || !accessToken) {
                throw new Error(`Meta API credentials missing for merchant: ${merchant.id}`);
            }
            await axios_1.default.post(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: cleanPhone,
                type: 'text',
                text: {
                    preview_url: false,
                    body: text
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
        }
        else {
            // Evolution API
            const apiUrl = process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080';
            const instanceName = config.instanceName || process.env.EVOLUTION_INSTANCE_NAME || 'cardapio_instance';
            const apiKey = process.env.EVOLUTION_API_KEY || '';
            await axios_1.default.post(`${apiUrl}/message/sendText/${instanceName}`, {
                number: cleanPhone,
                options: { delay: 1200, presence: 'composing' },
                textMessage: { text }
            }, {
                headers: { apikey: apiKey }
            });
        }
    }
    catch (error) {
        console.error(`Failed to send WhatsApp message via ${merchant.whatsappProvider || 'EVOLUTION'} API:`, error);
        // Don't throw, let the app continue gracefully
    }
};
exports.sendWhatsAppMessage = sendWhatsAppMessage;
const notifyCustomerOrderReceived = async (order) => {
    const text = `*Olá ${order.customerName}!* \n\nSeu pedido na *${order.merchant.name}* foi recebido com sucesso. \n\n*Total:* ${formatCurrency(order.totalAmount)}\n*Status:* Pendente\n\nVocê será notificado quando o pedido sair para entrega.`;
    await (0, exports.sendWhatsAppMessage)(order.merchant, order.customerPhone, text);
};
exports.notifyCustomerOrderReceived = notifyCustomerOrderReceived;
const notifyMerchantNewOrder = async (order) => {
    let itemsText = order.items.map(i => `${i.quantity}x ${i.product.name}`).join('\n');
    let obsText = order.observation ? `\n*Observação:* ${order.observation}` : '';
    const text = `*Novo Pedido Recebido!*\n\n*Cliente:* ${order.customerName}\n*Contato:* ${order.customerPhone}\n*Tipo:* ${order.deliveryType === 'DELIVERY' ? 'Entrega' : 'Retirada'}\n*Endereço:* ${order.address || 'N/A'}\n*Pagamento:* ${order.paymentMethod}${obsText}\n\n*Itens:*\n${itemsText}\n\n*Total:* ${formatCurrency(order.totalAmount)}`;
    await (0, exports.sendWhatsAppMessage)(order.merchant, order.merchant.phone, text);
};
exports.notifyMerchantNewOrder = notifyMerchantNewOrder;
const notifyCustomerOrderStatus = async (order) => {
    let statusText = '';
    if (order.status === 'PREPARING')
        statusText = 'está sendo preparado';
    else if (order.status === 'SHIPPED')
        statusText = 'saiu para entrega';
    else if (order.status === 'FINISHED')
        statusText = 'foi finalizado';
    if (!statusText)
        return;
    const text = `*Olá ${order.customerName}!* \n\nSeu pedido na *${order.merchant.name}* ${statusText}.`;
    await (0, exports.sendWhatsAppMessage)(order.merchant, order.customerPhone, text);
};
exports.notifyCustomerOrderStatus = notifyCustomerOrderStatus;
