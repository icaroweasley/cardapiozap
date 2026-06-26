"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEvolutionInstance = exports.createEvolutionInstance = exports.getEvolutionState = void 0;
const axios_1 = __importDefault(require("axios"));
const getEvolutionState = async (req, res) => {
    try {
        const { instanceName } = req.params;
        if (!instanceName) {
            res.status(400).json({ error: 'instanceName required' });
            return;
        }
        const apiUrl = process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080';
        const apiKey = process.env.EVOLUTION_API_KEY || '';
        try {
            const response = await axios_1.default.get(`${apiUrl}/instance/connectionState/${instanceName}`, {
                headers: { apikey: apiKey }
            });
            let base64Qr = null;
            if (response.data?.instance?.state === 'connecting') {
                try {
                    const connectRes = await axios_1.default.get(`${apiUrl}/instance/connect/${instanceName}`, {
                        headers: { apikey: apiKey }
                    });
                    base64Qr = connectRes.data?.base64 || connectRes.data?.qrcode?.base64;
                }
                catch (err) {
                    console.error('Error fetching fresh QR for connecting instance:', err);
                }
            }
            res.json({
                ...response.data,
                base64: base64Qr
            });
        }
        catch (e) {
            if (e.response?.status === 404) {
                res.status(404).json({ error: 'Instance not found' });
            }
            else {
                throw e;
            }
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getEvolutionState = getEvolutionState;
const createEvolutionInstance = async (req, res) => {
    try {
        const { instanceName } = req.body;
        console.log(`\n\n--- CREATING EVOLUTION INSTANCE: ${instanceName} ---`);
        if (!instanceName) {
            res.status(400).json({ error: 'instanceName required' });
            return;
        }
        const apiUrl = process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080';
        const apiKey = process.env.EVOLUTION_API_KEY || '';
        // Try to create the instance
        let connectRes;
        try {
            const createRes = await axios_1.default.post(`${apiUrl}/instance/create`, {
                instanceName,
                qrcode: true,
                integration: "WHATSAPP-BAILEYS"
            }, {
                headers: { apikey: apiKey }
            });
            connectRes = createRes;
        }
        catch (e) {
            console.log(`Failed to create instance ${instanceName}, error:`, e.response?.data || e.message);
            // If it already exists, try to connect to get the QR code
            connectRes = await axios_1.default.get(`${apiUrl}/instance/connect/${instanceName}`, {
                headers: { apikey: apiKey }
            });
        }
        console.log("SENDING INSTANCE RES TO FRONTEND:", JSON.stringify(connectRes.data).substring(0, 200));
        res.json(connectRes.data);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createEvolutionInstance = createEvolutionInstance;
const deleteEvolutionInstance = async (req, res) => {
    try {
        const { instanceName } = req.params;
        if (!instanceName) {
            res.status(400).json({ error: 'instanceName required' });
            return;
        }
        const apiUrl = process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080';
        const apiKey = process.env.EVOLUTION_API_KEY || '';
        await axios_1.default.delete(`${apiUrl}/instance/logout/${instanceName}`, { headers: { apikey: apiKey } }).catch(() => { });
        await axios_1.default.delete(`${apiUrl}/instance/delete/${instanceName}`, { headers: { apikey: apiKey } }).catch(() => { });
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteEvolutionInstance = deleteEvolutionInstance;
