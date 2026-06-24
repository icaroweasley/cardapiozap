import { useState, useEffect } from 'react';
import { Settings2, Save, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react';

export default function SettingsPanel() {
  const [provider, setProvider] = useState<'EVOLUTION' | 'OFFICIAL'>('EVOLUTION');
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setProvider(data.whatsappProvider || 'EVOLUTION');
        setConfig(data.whatsappConfig || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('http://localhost:3001/api/auth/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          whatsappProvider: provider,
          whatsappConfig: config
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar configurações');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto hide-scrollbar h-full flex flex-col items-center">
      <div className="w-full max-w-4xl p-6 bg-white/60 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10 flex flex-col shadow-2xl relative overflow-hidden h-full">
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-6 mb-6">
          <div>
            <h2 className="font-podium text-2xl md:text-3xl uppercase tracking-widest text-black dark:text-white flex items-center gap-3">
              <Settings2 className="w-8 h-8" />
              Conexões
            </h2>
            <p className="font-inter text-sm text-black/60 dark:text-white/60 uppercase tracking-widest mt-2">
              Configurações de Mensageria e WhatsApp
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-6 py-3 font-inter text-xs tracking-widest uppercase font-bold hover:scale-105 transition-transform disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 flex items-center gap-3 text-green-600 dark:text-green-400 font-inter text-sm">
            <CheckCircle2 size={18} />
            Configurações salvas com sucesso!
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-600 dark:text-red-400 font-inter text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Provider Selection Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setProvider('EVOLUTION')}
            className={`flex-1 p-6 border transition-all flex flex-col items-center gap-4 ${
              provider === 'EVOLUTION'
                ? 'border-black dark:border-white bg-black/5 dark:bg-white/5'
                : 'border-black/10 dark:border-white/10 bg-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Smartphone className={`w-8 h-8 ${provider === 'EVOLUTION' ? 'text-black dark:text-white' : 'text-black/50 dark:text-white/50'}`} />
            <div className="text-center">
              <h3 className="font-podium text-xl tracking-widest uppercase text-black dark:text-white">Evolution API</h3>
              <p className="font-inter text-xs tracking-widest uppercase text-black/60 dark:text-white/60 mt-2">Instância Local</p>
            </div>
          </button>

          <button
            onClick={() => setProvider('OFFICIAL')}
            className={`flex-1 p-6 border transition-all flex flex-col items-center gap-4 ${
              provider === 'OFFICIAL'
                ? 'border-black dark:border-white bg-black/5 dark:bg-white/5'
                : 'border-black/10 dark:border-white/10 bg-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div className="text-center">
              <h3 className="font-podium text-xl tracking-widest uppercase text-black dark:text-white">API Oficial Meta</h3>
              <p className="font-inter text-xs tracking-widest uppercase text-black/60 dark:text-white/60 mt-2">WhatsApp Cloud API</p>
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {provider === 'EVOLUTION' ? (
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start p-8 border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
              <div className="w-64 h-64 border border-black/20 dark:border-white/20 bg-white flex items-center justify-center p-4">
                {/* Mock QR Code */}
                <div className="w-full h-full border-4 border-dashed border-black/30 dark:border-black/30 flex items-center justify-center text-center p-4">
                  <span className="font-inter text-xs text-black/50 font-bold uppercase tracking-widest">Aguardando QR Code da API</span>
                </div>
              </div>
              <div className="flex-1 w-full space-y-6">
                <div>
                  <h4 className="font-inter text-sm font-bold uppercase tracking-widest text-black dark:text-white mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                    Status da Instância
                  </h4>
                  <p className="font-inter text-sm text-black/70 dark:text-white/70">Desconectado. Escaneie o QR Code para conectar.</p>
                </div>
                <div>
                  <label className="block font-inter text-xs font-bold uppercase tracking-widest text-black/70 dark:text-white/70 mb-2">Nome da Instância</label>
                  <input
                    type="text"
                    value={config.instanceName || ''}
                    onChange={(e) => setConfig({ ...config, instanceName: e.target.value })}
                    className="w-full bg-transparent border-b border-black/20 dark:border-white/20 px-0 py-3 text-black dark:text-white font-inter focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                    placeholder="Ex: cardapio_loja1"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8 p-8 border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
              <div>
                <label className="block font-inter text-xs font-bold uppercase tracking-widest text-black/70 dark:text-white/70 mb-2">Phone Number ID</label>
                <input
                  type="text"
                  value={config.phoneNumberId || ''}
                  onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                  className="w-full bg-transparent border-b border-black/20 dark:border-white/20 px-0 py-3 text-black dark:text-white font-inter focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  placeholder="ID do número de telefone (ex: 104561234...)"
                />
              </div>

              <div>
                <label className="block font-inter text-xs font-bold uppercase tracking-widest text-black/70 dark:text-white/70 mb-2">Business Account ID</label>
                <input
                  type="text"
                  value={config.businessAccountId || ''}
                  onChange={(e) => setConfig({ ...config, businessAccountId: e.target.value })}
                  className="w-full bg-transparent border-b border-black/20 dark:border-white/20 px-0 py-3 text-black dark:text-white font-inter focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  placeholder="ID da conta WhatsApp Business"
                />
              </div>

              <div>
                <label className="block font-inter text-xs font-bold uppercase tracking-widest text-black/70 dark:text-white/70 mb-2">Access Token</label>
                <textarea
                  value={config.accessToken || ''}
                  onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                  rows={3}
                  className="w-full bg-transparent border-b border-black/20 dark:border-white/20 px-0 py-3 text-black dark:text-white font-inter focus:outline-none focus:border-black dark:focus:border-white transition-colors resize-none"
                  placeholder="Token de acesso temporário ou permanente"
                />
              </div>
              
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 font-inter text-sm">
                <strong>Aviso:</strong> Certifique-se de usar um Token Permanente para uso em produção. Tokens temporários expiram em 24h.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
