import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const activeWorkers = new Set<string>();

const randomDelay = (min: number, max: number) => {
  return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1) + min) * 1000));
};

export const startBroadcastWorker = async (merchantId: string) => {
  if (activeWorkers.has(merchantId)) return;
  activeWorkers.add(merchantId);

  try {
    while (true) {
      const session = await prisma.broadcastSession.findUnique({
        where: { merchantId }
      });

      if (!session || session.status !== 'running') {
        break; // Stop worker if paused, cancelled, or completed
      }

      const contacts = JSON.parse(session.contacts);
      if (session.currentIndex >= contacts.length) {
        await prisma.broadcastSession.update({
          where: { merchantId },
          data: { status: 'completed' }
        });
        break;
      }

      const contact = contacts[session.currentIndex];
      
      // If contact is already sent (maybe from previous run), skip
      if (contact.status === 'sent') {
        await prisma.broadcastSession.update({
          where: { merchantId },
          data: { currentIndex: session.currentIndex + 1 }
        });
        continue;
      }

      const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
      if (!merchant) break;

      // Limit checking
      const dateStr = new Date().toISOString().split('T')[0];
      const limit = merchant.isTrial ? merchant.trialBroadcastLimit : merchant.paidBroadcastLimit;
      const cleanPhone = contact.number.replace(/\D/g, '');

      let allowSend = true;
      try {
        const existingLog = await prisma.broadcastRecipientLog.findUnique({
          where: { merchantId_date_phone: { merchantId, date: dateStr, phone: cleanPhone } }
        });
        if (!existingLog) {
          const currentCount = await prisma.broadcastRecipientLog.count({
            where: { merchantId, date: dateStr }
          });
          if (currentCount >= limit) {
            allowSend = false;
            contact.status = 'error';
            contact.error = 'Limite diário atingido';
          } else {
            await prisma.broadcastRecipientLog.create({
              data: { merchantId, date: dateStr, phone: cleanPhone }
            });
          }
        }
      } catch(e) {}

      if (allowSend) {
        // Send message
        try {
          const apiUrl = process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080';
          const instanceName = `zapgarcom_${merchantId}`;
          const apiKey = process.env.EVOLUTION_API_KEY || '';

          // Parse media
          const mediaAttachments = JSON.parse(session.mediaAttachments || '[]');
          const hasMedia = mediaAttachments.length > 0;
          const media = hasMedia ? mediaAttachments[0] : null;

          // Replace vars
          let textToSend = session.messageText.replace(/{nome}/g, contact.name || 'Cliente');

          // 1. Send Presence
          try {
            const typingDuration = Math.floor(Math.random() * (20000 - 5000 + 1)) + 5000;
            await axios.post(`${apiUrl}/chat/sendPresence/${instanceName}`, {
              number: cleanPhone,
              presence: 'composing',
              delay: typingDuration
            }, { headers: { apikey: apiKey } });
            await new Promise(r => setTimeout(r, typingDuration + 1000)); // wait for typing simulation
          } catch(e) {}

          // 2. Send Message
          if (media) {
            let finalMedia = media.base64 || media.data || '';
            if (finalMedia && finalMedia.includes('base64,')) {
               finalMedia = finalMedia.split('base64,')[1];
            }
            const isVideo = media.type.startsWith('video');
            const isAudio = media.type.startsWith('audio');
            const mediaType = isVideo ? 'video' : isAudio ? 'audio' : 'image';

            const sendMediaOnly = async (captionText: string) => {
               await axios.post(`${apiUrl}/message/sendMedia/${instanceName}`, {
                  number: cleanPhone,
                  options: { delay: 1200, presence: 'composing' },
                  mediaMessage: {
                    mediatype: mediaType,
                    mimetype: media.type,
                    fileName: media.name || 'media',
                    caption: captionText,
                    media: finalMedia
                  }
               }, { headers: { apikey: apiKey } });
            };

            const sendTextOnly = async () => {
               if (textToSend) {
                 await axios.post(`${apiUrl}/message/sendText/${instanceName}`, {
                   number: cleanPhone,
                   options: { delay: 1200, presence: 'composing' },
                   textMessage: { text: textToSend }
                 }, { headers: { apikey: apiKey } });
               }
            };

            if (session.textPosition === 'before') {
              await sendTextOnly();
              await new Promise(r => setTimeout(r, 2000));
              await sendMediaOnly('');
            } else if (session.textPosition === 'after') {
              await sendMediaOnly('');
              await new Promise(r => setTimeout(r, 2000));
              await sendTextOnly();
            } else {
               if (isAudio) {
                  // Audio não suporta legenda embutida
                  await sendMediaOnly('');
                  await new Promise(r => setTimeout(r, 2000));
                  await sendTextOnly();
               } else {
                  await sendMediaOnly(textToSend || '');
               }
            }
          } else {
             await axios.post(`${apiUrl}/message/sendText/${instanceName}`, {
                number: cleanPhone,
                options: { delay: 1200, presence: 'composing' },
                textMessage: { text: textToSend }
              }, { headers: { apikey: apiKey } });
          }

          contact.status = 'sent';
        } catch (err: any) {
          contact.status = 'error';
          contact.error = err.response?.data?.message || err.message || 'Error';
        }
      }

      contacts[session.currentIndex] = contact;

      // Update DB
      await prisma.broadcastSession.update({
        where: { merchantId },
        data: {
          contacts: JSON.stringify(contacts),
          currentIndex: session.currentIndex + 1
        }
      });

      // Wait random delay before next
      if (session.currentIndex + 1 < contacts.length) {
         // Pause for 5 minutes every 50 contacts
         if ((session.currentIndex + 1) % 50 === 0) {
            console.log(`Pausando por 5 minutos após 50 envios...`);
            await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
         } else {
            await randomDelay(session.minDelay, session.maxDelay);
         }
      }
    }
  } catch (error) {
    console.error(`Worker error for ${merchantId}:`, error);
  } finally {
    activeWorkers.delete(merchantId);
  }
};

export const resumeAllRunningSessions = async () => {
  try {
    const sessions = await prisma.broadcastSession.findMany({
      where: { status: 'running' }
    });
    for (const s of sessions) {
      startBroadcastWorker(s.merchantId);
    }
  } catch(e) {}
};
