import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const router = Router();
const prisma = new PrismaClient();

router.post('/send', authenticateToken, async (req: any, res) => {
  try {
    const { number, text, mediaUrl, mediaType } = req.body;
    const userId = req.user.merchantId;

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
      } catch (e) {
        console.error('Failed to parse merchant whatsappConfig', e);
      }
    }

    const cleanPhone = number.replace(/\D/g, '');

    if (provider === 'OFFICIAL') {
      const phoneNumberId = config.phoneNumberId;
      const accessToken = config.accessToken;

      if (!phoneNumberId || !accessToken) {
        return res.status(400).json({ error: 'Credenciais Meta API ausentes' });
      }

      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
      };

      if (mediaUrl && mediaType) {
        payload.type = mediaType; // 'image' or 'video'
        payload[mediaType] = {
          link: mediaUrl
        };
        if (text) {
          payload[mediaType].caption = text;
        }
      } else {
        payload.type = 'text';
        payload.text = {
          preview_url: false,
          body: text
        };
      }

      await axios.post(
        `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
        payload,
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

      if (mediaUrl && mediaType) {
        await axios.post(
          `${apiUrl}/message/sendMedia/${instanceName}`,
          {
            number: cleanPhone,
            options: { delay: 1200, presence: 'composing' },
            mediaMessage: {
              mediatype: mediaType, // 'image' or 'video'
              caption: text || '',
              media: mediaUrl
            }
          },
          {
            headers: { apikey: apiKey }
          }
        );
      } else {
        await axios.post(
          `${apiUrl}/message/sendText/${instanceName}`,
          {
            number: cleanPhone,
            options: { delay: 1200, presence: 'composing' },
            textMessage: { text: text || '' }
          },
          {
            headers: { apikey: apiKey }
          }
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
