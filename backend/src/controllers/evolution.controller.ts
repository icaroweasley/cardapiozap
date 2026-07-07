import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import axios from 'axios';

export const getEvolutionState = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const instanceName = `zapgarcom_${req.merchantId}`;

    const apiUrl = process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080';
    const apiKey = process.env.EVOLUTION_API_KEY || '';

    try {
      const response = await axios.get(`${apiUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey: apiKey }
      });
      
      let base64Qr = null;
      if (response.data?.instance?.state === 'connecting') {
        try {
          const connectRes = await axios.get(`${apiUrl}/instance/connect/${instanceName}`, {
            headers: { apikey: apiKey }
          });
          base64Qr = connectRes.data?.base64 || connectRes.data?.qrcode?.base64;
        } catch (err) {
          console.error('Error fetching fresh QR for connecting instance:', err);
        }
      }

      res.json({
        ...response.data,
        base64: base64Qr
      });
    } catch (e: any) {
      if (e.response?.status === 404) {
        res.status(404).json({ error: 'Instance not found' });
      } else {
        throw e;
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createEvolutionInstance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const instanceName = `zapgarcom_${req.merchantId}`;
    console.log(`\n\n--- CREATING EVOLUTION INSTANCE: ${instanceName} ---`);

    const apiUrl = process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080';
    const apiKey = process.env.EVOLUTION_API_KEY || '';

    // Try to create the instance
    let connectRes;
    try {
      const createRes = await axios.post(`${apiUrl}/instance/create`, {
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS"
      }, {
        headers: { apikey: apiKey }
      });

      // Update settings to sync full history
      await axios.post(`${apiUrl}/settings/set/${instanceName}`, {
        syncFullHistory: true,
        readContacts: true,
        readChats: true
      }, {
        headers: { apikey: apiKey }
      }).catch(err => console.log('Failed to set settings:', err?.response?.data || err.message));

      connectRes = createRes;
    } catch (e: any) {
      console.log(`Failed to create instance ${instanceName}, error:`, e.response?.data || e.message);
      // If it already exists, try to connect to get the QR code
      connectRes = await axios.get(`${apiUrl}/instance/connect/${instanceName}`, {
        headers: { apikey: apiKey }
      });
    }

    console.log("SENDING INSTANCE RES TO FRONTEND:", JSON.stringify(connectRes.data).substring(0, 200));
    res.json(connectRes.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteEvolutionInstance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const instanceName = `zapgarcom_${req.merchantId}`;

    const apiUrl = process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080';
    const apiKey = process.env.EVOLUTION_API_KEY || '';

    await axios.delete(`${apiUrl}/instance/logout/${instanceName}`, { headers: { apikey: apiKey } }).catch(() => {});
    await axios.delete(`${apiUrl}/instance/delete/${instanceName}`, { headers: { apikey: apiKey } }).catch(() => {});

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
