import { useState, useEffect } from 'react';
import { Settings2, Save, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react';

export default function SettingsPanel() {
  const [provider, setProvider] = useState<'EVOLUTION' | 'OFFICIAL'>('EVOLUTION');
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [instanceStatus, setInstanceStatus] = useState<string>('Desconectado');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchInstanceStatus = async (currentConfig = config) => {
    if (!currentConfig.instanceName || provider !== 'EVOLUTION') return;
    try {
      const res = await fetch(`/api/auth/evolution/instance/${currentConfig.instanceName}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.instance?.state === 'open') {
          setInstanceStatus('Conectado');
          setQrCode(null);
        } else if (data.instance?.state === 'close') {
          setInstanceStatus('Desconectado');
        } else if (data.instance?.state === 'connecting') {
          setInstanceStatus('Conectando...');
        }
      } else {
        setInstanceStatus('Não criada');
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (provider === 'EVOLUTION' && config.instanceName) {
      fetchInstanceStatus();
      const interval = setInterval(() => fetchInstanceStatus(), 5000);
      return () => clearInterval(interval);
    }
  }, [provider, config.instanceName]);

  const handleConnectInstance = async () => {
    if (!config.instanceName) return alert('Digite um nome de instância e salve primeiro.');
    setIsChecking(true);
    setInstanceStatus('Gerando QR Code...');
    setQrCode(null);
    try {
      const res = await fetch('/api/auth/evolution/instance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ instanceName: config.instanceName })
      });
      const data = await res.json();
      if (data.base64) {
        setQrCode(data.base64);
        setInstanceStatus('Aguardando leitura do QR Code...');
      } else {
        fetchInstanceStatus();
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao criar/conectar instância.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDisconnectInstance = async () => {
    if (!confirm('Deseja realmente desconectar e apagar esta instância?')) return;
    try {
      await fetch(`/api/auth/evolution/instance/${config.instanceName}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setInstanceStatus('Desconectado');
      setQrCode(null);
      alert('Instância desconectada e removida com sucesso.');
    } catch (e) {
      console.error(e);
      alert('Erro ao desconectar instância.');
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/auth/settings', {
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
      const response = await fetch('/api/auth/settings', {
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
      <div className="w-full max-w-4xl p-6 bg-white/60 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10 flex flex-col shadow-2xl relative overflow-hidden h-full rounded-3xl lg:m-2">
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
            className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-6 py-3 font-inter text-xs tracking-widest uppercase font-bold hover:scale-105 transition-transform disabled:opacity-50 rounded-xl"
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 flex items-center gap-3 text-green-600 dark:text-green-400 font-inter text-sm rounded-xl">
            <CheckCircle2 size={18} />
            Configurações salvas com sucesso!
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-600 dark:text-red-400 font-inter text-sm rounded-xl">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Provider Selection Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setProvider('EVOLUTION')}
            className={`flex-1 p-6 border transition-all flex flex-col items-center gap-4 rounded-2xl ${
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
            className={`flex-1 p-6 border transition-all flex flex-col items-center gap-4 rounded-2xl ${
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
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start p-8 border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 rounded-2xl">
              <div className="w-64 h-64 border border-black/20 dark:border-white/20 bg-white flex flex-col items-center justify-center p-4 rounded-2xl relative overflow-hidden shrink-0">
                {qrCode ? (
                  <img src={qrCode} alt="QR Code" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full border-4 border-dashed border-black/30 dark:border-black/30 flex flex-col gap-2 items-center justify-center text-center p-4 rounded-xl">
                    <span className="font-inter text-xs text-black/50 font-bold uppercase tracking-widest">
                      {instanceStatus === 'Conectado' ? 'Instância Conectada' : 'Sem QR Code'}
                    </span>
                    {instanceStatus !== 'Conectado' && (
                      <button 
                        onClick={handleConnectInstance}
                        disabled={isChecking || !config.instanceName}
                        className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 text-[10px] uppercase tracking-widest font-bold rounded-lg disabled:opacity-50"
                      >
                        {isChecking ? 'Carregando...' : 'Gerar QR Code'}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 w-full space-y-6">
                <div>
                  <h4 className="font-inter text-sm font-bold uppercase tracking-widest text-black dark:text-white mb-2 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${instanceStatus === 'Conectado' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></span>
                    Status da Instância
                  </h4>
                  <div className="flex items-center justify-between">
                    <p className="font-inter text-sm text-black/70 dark:text-white/70">{instanceStatus}</p>
                    {instanceStatus === 'Conectado' && (
                      <button onClick={handleDisconnectInstance} className="text-xs uppercase tracking-widest font-bold text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors">
                        Desconectar
                      </button>
                    )}
                  </div>
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
                  <p className="text-[10px] uppercase font-inter mt-1 opacity-50 tracking-widest">Salve a configuração antes de gerar o QR Code.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8 p-8 border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 rounded-2xl">
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
              
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 font-inter text-sm rounded-xl">
                <strong>Aviso:</strong> Certifique-se de usar um Token Permanente para uso em produção. Tokens temporários expiram em 24h.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
