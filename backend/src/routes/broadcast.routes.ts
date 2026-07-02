import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// Lists CRUD
router.get('/lists', authenticate, async (req: any, res) => {
  try {
    const lists = await prisma.savedList.findMany({
      where: { merchantId: req.merchantId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(lists);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao buscar listas' });
  }
});

router.post('/lists', authenticate, async (req: any, res) => {
  try {
    const { name, contacts } = req.body;
    const newList = await prisma.savedList.create({
      data: {
        merchantId: req.merchantId,
        name,
        contacts: JSON.stringify(contacts)
      }
    });
    res.json(newList);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao salvar lista' });
  }
});

router.delete('/lists/:id', authenticate, async (req: any, res) => {
  try {
    await prisma.savedList.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao deletar lista' });
  }
});

router.get('/customers', authenticate, async (req: any, res) => {
  try {
    const merchantId = req.merchantId;
    // Get unique customers from orders
    const orders = await prisma.order.findMany({
      where: { merchantId },
      select: { customerName: true, customerPhone: true },
      distinct: ['customerPhone']
    });

    const customers = orders.map(o => ({
      name: o.customerName,
      number: o.customerPhone.replace(/\D/g, '')
    })).filter(c => c.number.length >= 10);

    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/whatsapp-contacts', authenticate, async (req: any, res) => {
  try {
    const merchantId = req.merchantId;
    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) return res.status(404).json({ error: 'Lojista não encontrado' });
    
    if (merchant.whatsappProvider !== 'EVOLUTION') {
       return res.status(400).json({ error: 'Sincronização de contatos só está disponível na Evolution API' });
    }

    let config: any = {};
    try { config = JSON.parse(merchant.whatsappConfig || '{}'); } catch(e) {}
    
    const apiUrl = process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080';
    const instanceName = config.instanceName || 'cardapio_instance';
    const apiKey = process.env.EVOLUTION_API_KEY || '';

    const endpointsToTry = [
      { path: `/chat/findContacts/${instanceName}`, method: 'POST', data: {} },
      { path: `/v2/chat/findContacts/${instanceName}`, method: 'POST', data: {} },
      { path: `/contact/find/${instanceName}`, method: 'POST', data: {} },
      { path: `/v2/contact/fetchContacts/${instanceName}`, method: 'GET' },
      { path: `/contact/fetchContacts/${instanceName}`, method: 'GET' },
      { path: `/chat/fetchContacts/${instanceName}`, method: 'GET' }
    ];

    let success = false;
    let customers: any[] = [];

    for (const endpoint of endpointsToTry) {
      try {
        const reqConfig: any = {
          method: endpoint.method,
          url: `${apiUrl}${endpoint.path}`,
          headers: { apikey: apiKey }
        };
        if (endpoint.method === 'POST') {
          reqConfig.data = endpoint.data;
        }

        const response = await axios(reqConfig);
        
        const rawContacts = Array.isArray(response.data) ? response.data : (response.data?.contacts || response.data?.data || []);
        
        customers = rawContacts.map((c: any) => ({
           name: c.pushName || c.name || '',
           number: (c.remoteJid || c.id || c.number || '').split('@')[0]
        })).filter((c: any) => c.number && c.number.length >= 10);
        
        success = true;
        break; // Stop at first successful endpoint
      } catch (e) {
        // Silently try next
      }
    }

    if (!success) {
      throw new Error('All contact fetch endpoints failed.');
    }
    
    res.json(customers);
  } catch (error: any) {
    console.error('Error fetching whatsapp contacts:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch whatsapp contacts' });
  }
});

router.post('/presence', authenticate, async (req: any, res) => {
  try {
    const { number, presence, delay } = req.body;
    const merchantId = req.merchantId;
    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant || merchant.whatsappProvider !== 'EVOLUTION') return res.json({ success: true });
    
    let config: any = {};
    try { config = JSON.parse(merchant.whatsappConfig || '{}'); } catch(e) {}
    
    const apiUrl = process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080';
    const instanceName = config.instanceName || 'cardapio_instance';
    const apiKey = process.env.EVOLUTION_API_KEY || '';
    
    const cleanPhone = number.replace(/\D/g, '');
    
    await axios.post(`${apiUrl}/chat/sendPresence/${instanceName}`, {
      number: cleanPhone,
      presence: presence || 'composing',
      delay: delay || 2000
    }, { headers: { apikey: apiKey } });
    
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false });
  }
});

router.post('/send', authenticate, async (req: any, res) => {
  try {
    const { number, text, mediaUrl, mediaType, mediaBase64, fileName } = req.body;
    const userId = req.merchantId;

    const merchant = await prisma.merchant.findUnique({
      where: { id: userId }
    });

    if (!merchant) {
      return res.status(404).json({ error: 'Lojista não encontrado' });
    }

    const provider = merchant.whatsappProvider || 'EVOLUTION';
    let config: any = {};
    if (merchant.whatsappConfig) {
      try {
        config = JSON.parse(merchant.whatsappConfig);
      } catch (e) {}
    }

    const cleanPhone = number.replace(/\D/g, '');
    const dateStr = new Date().toISOString().split('T')[0];

    // Track unique recipients and check limit
    try {
      const existingLog = await prisma.broadcastRecipientLog.findUnique({
        where: {
          merchantId_date_phone: {
            merchantId: userId,
            date: dateStr,
            phone: cleanPhone
          }
        }
      });

      if (!existingLog) {
        // It's a new unique recipient today, check limit
        const currentUniqueCount = await prisma.broadcastRecipientLog.count({
          where: { merchantId: userId, date: dateStr }
        });
        
        const limit = merchant.isTrial ? merchant.trialBroadcastLimit : merchant.paidBroadcastLimit;
        
        if (currentUniqueCount >= limit) {
          return res.status(403).json({ error: `Limite diário atingido (${limit} clientes diferentes/dia).` });
        }

        // Log this new recipient
        await prisma.broadcastRecipientLog.create({
          data: {
            merchantId: userId,
            date: dateStr,
            phone: cleanPhone
          }
        });
      }
    } catch (dbError) {
      console.error('Error tracking broadcast recipient:', dbError);
      // Proceed even if DB tracking fails temporarily, or block? Best to just continue.
    }

    if (provider === 'OFFICIAL') {
      const phoneNumberId = config.phoneNumberId;
      const accessToken = config.accessToken;

      if (!phoneNumberId || !accessToken) return res.status(400).json({ error: 'Credenciais Meta API ausentes' });

      const payload: any = { messaging_product: 'whatsapp', recipient_type: 'individual', to: cleanPhone };

      if (mediaUrl && mediaType) {
        payload.type = mediaType;
        payload[mediaType] = { link: mediaUrl };
        if (text) payload[mediaType].caption = text;
      } else {
        payload.type = 'text';
        payload.text = { preview_url: false, body: text };
      }

      await axios.post(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, payload, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      });
    } else {
      // Evolution API
      const apiUrl = process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080';
      const instanceName = config.instanceName || process.env.EVOLUTION_INSTANCE_NAME || 'cardapio_instance';
      const apiKey = process.env.EVOLUTION_API_KEY || '';

      if (mediaBase64 || mediaUrl) {
        let finalMedia = mediaBase64 || mediaUrl;
        if (finalMedia && finalMedia.includes('base64,')) {
           finalMedia = finalMedia.split('base64,')[1];
        }
        
        await axios.post(
          `${apiUrl}/message/sendMedia/${instanceName}`,
          {
            number: cleanPhone,
            options: { delay: 1200, presence: 'composing' },
            mediaMessage: {
              mediatype: mediaType, // 'image' or 'video'
              mimetype: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
              fileName: fileName || 'media',
              caption: text || '',
              media: finalMedia
            }
          },
          { headers: { apikey: apiKey } }
        );
      } else {
        await axios.post(
          `${apiUrl}/message/sendText/${instanceName}`,
          {
            number: cleanPhone,
            options: { delay: 1200, presence: 'composing' },
            textMessage: { text: text || '' }
          },
          { headers: { apikey: apiKey } }
        );
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro no envio de broadcast:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Falha ao enviar mensagem', details: error?.response?.data || error.message });
  }
});

export default router;
