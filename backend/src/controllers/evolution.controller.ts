import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import axios from 'axios';

export const getEvolutionState = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { instanceName } = req.params;
    if (!instanceName) { res.status(400).json({ error: 'instanceName required' }); return; }

    const apiUrl = process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080';
    const apiKey = process.env.EVOLUTION_API_KEY || '';

    try {
      const response = await axios.get(`${apiUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey: apiKey }
      });
      res.json(response.data);
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
    const { instanceName } = req.body;
    if (!instanceName) { res.status(400).json({ error: 'instanceName required' }); return; }

    const apiUrl = process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080';
    const apiKey = process.env.EVOLUTION_API_KEY || '';

    // Create or reconnect
    await axios.post(`${apiUrl}/instance/create`, {
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS"
    }, {
      headers: { apikey: apiKey }
    }).catch(e => {
       // ignore if already exists
    });

    // Try to connect to fetch QR code
    const connectRes = await axios.get(`${apiUrl}/instance/connect/${instanceName}`, {
      headers: { apikey: apiKey }
    });

    res.json(connectRes.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteEvolutionInstance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { instanceName } = req.params;
    if (!instanceName) { res.status(400).json({ error: 'instanceName required' }); return; }

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
