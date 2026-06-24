import axios from 'axios';
import { Order, OrderItem, Product, Merchant } from '@prisma/client';

type FullOrder = Order & {
  items: (OrderItem & { product: Product })[];
  merchant: Merchant;
};

const formatCurrency = (cents: number) => {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const sendWhatsAppMessage = async (merchant: Merchant, phone: string, text: string) => {
  try {
    const provider = merchant.whatsappProvider || 'EVOLUTION';
    let config: any = {};
    if (merchant.whatsappConfig) {
      try {
        config = JSON.parse(merchant.whatsappConfig);
      } catch (e) {
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

      await axios.post(
        `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: text
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } else {
      // Evolution API
      const apiUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
      const instanceName = config.instanceName || process.env.EVOLUTION_INSTANCE_NAME || 'cardapio_instance';
      const apiKey = process.env.EVOLUTION_API_KEY || '';

      await axios.post(
        `${apiUrl}/message/sendText/${instanceName}`,
        {
          number: cleanPhone,
          options: { delay: 1200, presence: 'composing' },
          textMessage: { text }
        },
        {
          headers: { apikey: apiKey }
        }
      );
    }
  } catch (error) {
    console.error(`Failed to send WhatsApp message via ${merchant.whatsappProvider || 'EVOLUTION'} API:`, error);
    // Don't throw, let the app continue gracefully
  }
};

export const notifyCustomerOrderReceived = async (order: FullOrder) => {
  const text = `*Olá ${order.customerName}!* \n\nSeu pedido na *${order.merchant.name}* foi recebido com sucesso. \n\n*Total:* ${formatCurrency(order.totalAmount)}\n*Status:* Pendente\n\nVocê será notificado quando o pedido sair para entrega.`;
  await sendWhatsAppMessage(order.merchant, order.customerPhone, text);
};

export const notifyMerchantNewOrder = async (order: FullOrder) => {
  let itemsText = order.items.map(i => `${i.quantity}x ${i.product.name}`).join('\n');
  let obsText = order.observation ? `\n*Observação:* ${order.observation}` : '';
  
  const text = `*Novo Pedido Recebido!*\n\n*Cliente:* ${order.customerName}\n*Contato:* ${order.customerPhone}\n*Tipo:* ${order.deliveryType === 'DELIVERY' ? 'Entrega' : 'Retirada'}\n*Endereço:* ${order.address || 'N/A'}\n*Pagamento:* ${order.paymentMethod}${obsText}\n\n*Itens:*\n${itemsText}\n\n*Total:* ${formatCurrency(order.totalAmount)}`;
  await sendWhatsAppMessage(order.merchant, order.merchant.phone, text);
};

export const notifyCustomerOrderStatus = async (order: FullOrder) => {
  let statusText = '';
  if (order.status === 'PREPARING') statusText = 'está sendo preparado';
  else if (order.status === 'SHIPPED') statusText = 'saiu para entrega';
  else if (order.status === 'FINISHED') statusText = 'foi finalizado';

  if (!statusText) return;

  const text = `*Olá ${order.customerName}!* \n\nSeu pedido na *${order.merchant.name}* ${statusText}.`;
  await sendWhatsAppMessage(order.merchant, order.customerPhone, text);
};
