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
      const res = await fetch(`http://163.176.37.93:3001/api/auth/evolution/instance/${currentConfig.instanceName}`, {
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
          if (data.base64) {
            setQrCode(data.base64);
          }
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
      const res = await fetch('http://163.176.37.93:3001/api/auth/evolution/instance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ instanceName: config.instanceName })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao comunicar com servidor');
      }
      const data = await res.json();
      const base64Qr = data.base64 || data.qrcode?.base64;
      if (base64Qr) {
        setQrCode(base64Qr);
        setInstanceStatus('Aguardando leitura do QR Code...');
      } else {
        fetchInstanceStatus();
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Erro ao criar/conectar instância.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDisconnectInstance = async () => {
    if (!confirm('Deseja realmente desconectar e apagar esta instância?')) return;
    try {
      await fetch(`http://163.176.37.93:3001/api/auth/evolution/instance/${config.instanceName}`, {
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
      const response = await fetch('http://163.176.37.93:3001/api/auth/settings', {
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
      const response = await fetch('http://163.176.37.93:3001/api/auth/settings', {
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
      <div className="w-full max-w-4xl p-6 bg-white/60 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10 flex flex-col shadow-2xl relative h-fit min-h-full rounded-3xl lg:m-2">
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
        <div className="flex gap-4 lg:gap-6 mb-8 lg:mb-10 w-full">
          <button
            onClick={() => setProvider('EVOLUTION')}
            className={`flex-1 relative p-6 lg:p-8 transition-all flex flex-col items-center gap-4 rounded-[2rem] overflow-hidden group border ${
              provider === 'EVOLUTION'
                ? 'border-black/20 dark:border-white/20 bg-white/60 dark:bg-black/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.04)] scale-[1.02]'
                : 'border-black/5 dark:border-white/5 bg-white/20 dark:bg-black/20 opacity-70 hover:opacity-100 hover:scale-[1.01]'
            }`}
          >
            {provider === 'EVOLUTION' && <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent dark:from-white/5 pointer-events-none" />}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center relative z-10 transition-colors ${provider === 'EVOLUTION' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50 group-hover:bg-black/10 dark:group-hover:bg-white/10'}`}>
               <Smartphone className="w-6 h-6" />
            </div>
            <div className="text-center relative z-10">
              <h3 className="font-podium text-lg lg:text-xl tracking-widest uppercase text-black dark:text-white">Evolution API</h3>
              <p className="font-inter text-[9px] lg:text-[10px] font-bold tracking-widest uppercase text-black/50 dark:text-white/50 mt-2">Instância Local / QR Code</p>
            </div>
          </button>

          <button
            onClick={() => setProvider('OFFICIAL')}
            className={`flex-1 relative p-6 lg:p-8 transition-all flex flex-col items-center gap-4 rounded-[2rem] overflow-hidden group border ${
              provider === 'OFFICIAL'
                ? 'border-emerald-500/30 dark:border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-[0_8px_30px_rgba(16,185,129,0.1)] scale-[1.02]'
                : 'border-black/5 dark:border-white/5 bg-white/20 dark:bg-black/20 opacity-70 hover:opacity-100 hover:scale-[1.01]'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center relative z-10 transition-colors ${provider === 'OFFICIAL' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50 group-hover:bg-black/10 dark:group-hover:bg-white/10'}`}>
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="text-center relative z-10">
              <h3 className="font-podium text-lg lg:text-xl tracking-widest uppercase text-black dark:text-white">API Oficial Meta</h3>
              <p className="font-inter text-[9px] lg:text-[10px] font-bold tracking-widest uppercase text-black/50 dark:text-white/50 mt-2">WhatsApp Cloud API</p>
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="w-full flex-1">
          {provider === 'EVOLUTION' ? (
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 p-6 lg:p-8 border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/30 backdrop-blur-xl shadow-inner rounded-[2.5rem] relative overflow-hidden">
               <div className="w-full lg:w-64 lg:h-64 shrink-0 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-[2rem] p-5 flex items-center justify-center relative shadow-lg group aspect-square lg:aspect-auto">
                   {qrCode ? (
                     <img src={qrCode} alt="QR Code" className="w-full h-full object-contain rounded-xl" />
                   ) : (
                     <div className="w-full h-full border border-dashed border-black/20 dark:border-white/20 flex flex-col gap-4 items-center justify-center text-center p-6 rounded-2xl bg-black/5 dark:bg-black/40">
                       <Smartphone className="w-10 h-10 text-black/20 dark:text-white/20" />
                       <span className="font-inter text-[10px] text-black/40 dark:text-white/40 font-bold uppercase tracking-widest leading-relaxed">
                         {instanceStatus === 'Conectado' ? 'Instância Conectada' : 'Nenhum QR Code Gerado'}
                       </span>
                     </div>
                   )}
               </div>
               
               <div className="flex-1 w-full flex flex-col gap-6">
                 {/* Status Section */}
                 <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4">
                       <div className={`w-3 h-3 rounded-full shadow-lg ${instanceStatus === 'Conectado' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-amber-500 animate-pulse shadow-amber-500/50'}`}></div>
                       <div>
                         <p className="font-podium text-[10px] md:text-xs uppercase tracking-widest text-black/50 dark:text-white/50 mb-1">Status da Conexão</p>
                         <h4 className="font-inter font-bold text-black dark:text-white tracking-wider text-sm md:text-base">{instanceStatus}</h4>
                       </div>
                    </div>
                    {instanceStatus === 'Conectado' && (
                       <button onClick={handleDisconnectInstance} className="text-[10px] uppercase tracking-widest font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-4 py-2.5 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center gap-2">
                         Desconectar
                       </button>
                    )}
                 </div>

                 {/* Settings Section */}
                 <div className="flex flex-col gap-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-5 rounded-2xl shadow-sm">
                    <div className="relative">
                      <label className="block font-inter text-[9px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2 ml-1">Nome da Instância</label>
                      <input
                        type="text"
                        value={config.instanceName || ''}
                        onChange={(e) => setConfig({ ...config, instanceName: e.target.value })}
                        className="w-full bg-white/60 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-all font-inter shadow-inner"
                        placeholder="Ex: cardapio_loja1"
                      />
                    </div>
                    {instanceStatus !== 'Conectado' && (
                      <button 
                        onClick={handleConnectInstance}
                        disabled={isChecking || !config.instanceName}
                        className="w-full bg-black dark:bg-white text-white dark:text-black px-6 py-4 text-[10px] uppercase tracking-widest font-bold rounded-xl disabled:opacity-50 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 shadow-xl mt-2"
                      >
                        <Smartphone size={16} />
                        {isChecking ? 'Gerando QR Code...' : 'Gerar QR Code de Conexão'}
                      </button>
                    )}
                 </div>

                 {/* Instructions */}
                 <div className="bg-white/50 dark:bg-black/50 border border-black/5 dark:border-white/5 p-6 rounded-2xl text-xs font-inter mt-auto shadow-sm">
                    <strong className="flex items-center gap-2 uppercase tracking-widest text-[10px] mb-4 text-black dark:text-white">
                      <div className="w-1.5 h-1.5 rounded-full bg-black/40 dark:bg-white/40"></div>
                      Como conectar o dispositivo:
                    </strong>
                    <ol className="list-decimal list-inside space-y-2.5 text-black/60 dark:text-white/60 font-medium ml-1">
                      <li>Abra o WhatsApp no seu celular</li>
                      <li>Clique nos três pontinhos (⋮) ou Configurações</li>
                      <li>Vá em <strong className="text-black/80 dark:text-white/80 font-bold">Dispositivos Conectados</strong></li>
                      <li>Clique em <strong className="text-black/80 dark:text-white/80 font-bold">Conectar Dispositivo</strong></li>
                      <li>Aponte a câmera para o QR Code ao lado</li>
                    </ol>
                 </div>
               </div>
            </div>
          ) : (
            <div className="space-y-6 p-8 border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/30 backdrop-blur-xl shadow-inner rounded-[2.5rem]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="block font-inter text-[9px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 ml-1">Phone Number ID</label>
                  <input
                    type="text"
                    value={config.phoneNumberId || ''}
                    onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                    className="w-full bg-white/60 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-all font-inter shadow-inner"
                    placeholder="ID do número de telefone (ex: 104561234...)"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="block font-inter text-[9px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 ml-1">Business Account ID</label>
                  <input
                    type="text"
                    value={config.businessAccountId || ''}
                    onChange={(e) => setConfig({ ...config, businessAccountId: e.target.value })}
                    className="w-full bg-white/60 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-all font-inter shadow-inner"
                    placeholder="ID da conta WhatsApp Business"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="block font-inter text-[9px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 ml-1">Access Token</label>
                <textarea
                  value={config.accessToken || ''}
                  onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                  rows={3}
                  className="w-full bg-white/60 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-all font-inter shadow-inner resize-none"
                  placeholder="Token de acesso temporário ou permanente"
                />
              </div>
              
              <div className="p-5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 font-inter text-xs rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <AlertCircle size={16} />
                </div>
                <p>
                  <strong className="uppercase tracking-widest block mb-1 text-[10px]">Aviso Importante</strong> 
                  Certifique-se de usar um <strong className="text-amber-700 dark:text-amber-400">Token Permanente</strong> para uso em produção. Tokens temporários expiram em 24 horas e desativarão o serviço.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
