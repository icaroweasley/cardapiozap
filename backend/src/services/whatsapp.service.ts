import axios from 'axios';
import { Order, OrderItem, Product, Merchant } from '@prisma/client';

type FullOrder = Order & {
  items: (OrderItem & { product: Product })[];
  merchant: Merchant;
};

const formatCurrency = (cents: number) => {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const sendWhatsAppMessage = async (phone: string, text: string) => {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'cardapio_instance';
    const apiKey = process.env.EVOLUTION_API_KEY || '';

    await axios.post(
      `${apiUrl}/message/sendText/${instanceName}`,
      {
        number: phone,
        options: { delay: 1200, presence: 'composing' },
        textMessage: { text }
      },
      {
        headers: { apikey: apiKey }
      }
    );
  } catch (error) {
    console.error('Failed to send WhatsApp message via Evolution API:', error);
    // Don't throw, let the app continue gracefully
  }
};

export const notifyCustomerOrderReceived = async (order: FullOrder) => {
  const text = `*Olá ${order.customerName}!* \n\nSeu pedido na *${order.merchant.name}* foi recebido com sucesso. \n\n*Total:* ${formatCurrency(order.totalAmount)}\n*Status:* Pendente\n\nVocê será notificado quando o pedido sair para entrega.`;
  await sendWhatsAppMessage(order.customerPhone, text);
};

export const notifyMerchantNewOrder = async (order: FullOrder) => {
  let itemsText = order.items.map(i => `${i.quantity}x ${i.product.name}`).join('\n');
  
  const text = `*Novo Pedido Recebido!*\n\n*Cliente:* ${order.customerName}\n*Contato:* ${order.customerPhone}\n*Tipo:* ${order.deliveryType === 'DELIVERY' ? 'Entrega' : 'Retirada'}\n*Endereço:* ${order.address || 'N/A'}\n*Pagamento:* ${order.paymentMethod}\n\n*Itens:*\n${itemsText}\n\n*Total:* ${formatCurrency(order.totalAmount)}`;
  await sendWhatsAppMessage(order.merchant.phone, text);
};

export const notifyCustomerOrderStatus = async (order: FullOrder) => {
  let statusText = '';
  if (order.status === 'PREPARING') statusText = 'está sendo preparado';
  else if (order.status === 'SHIPPED') statusText = 'saiu para entrega';
  else if (order.status === 'FINISHED') statusText = 'foi finalizado';

  if (!statusText) return;

  const text = `*Olá ${order.customerName}!* \n\nSeu pedido na *${order.merchant.name}* ${statusText}.`;
  await sendWhatsAppMessage(order.customerPhone, text);
};
