import { useState, useEffect } from 'react';
import { Settings2, Smartphone, Cloud, Save } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

export default function SettingsPanel() {
  const [config, setConfig] = useState<any>({});
  const [provider, setProvider] = useState<'EVOLUTION' | 'OFFICIAL'>('EVOLUTION');
  const [loading, setLoading] = useState(true);
  const [isSavingMeta, setIsSavingMeta] = useState(false);

  const [instanceStatus, setInstanceStatus] = useState<string>('Desconectado');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchInstanceStatus = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/auth/evolution/instance/me`, {
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
    fetchInstanceStatus();
    const interval = setInterval(() => fetchInstanceStatus(), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectInstance = async () => {
    setIsChecking(true);
    setInstanceStatus('Gerando QR Code...');
    setQrCode(null);
    try {
      // Salva as configurações automaticamente antes de gerar
      await fetch(`${apiUrl}/api/auth/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          whatsappProvider: 'EVOLUTION',
          whatsappConfig: config
        })
      });

      const res = await fetch(`${apiUrl}/api/auth/evolution/instance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({})
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
      useToastStore.getState().addToast(e.message || 'Erro ao criar/conectar instância.', 'error');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDisconnectInstance = async () => {
    if (!confirm('Deseja realmente desconectar e apagar esta instância?')) return;
    try {
      await fetch(`${apiUrl}/api/auth/evolution/instance/me`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setInstanceStatus('Desconectado');
      setQrCode(null);
      useToastStore.getState().addToast('Instância desconectada e removida com sucesso.', 'success');
    } catch (e) {
      console.error(e);
      useToastStore.getState().addToast('Erro ao desconectar instância.', 'error');
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setConfig(data.whatsappConfig || {});
        setProvider(data.whatsappProvider || 'EVOLUTION');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMetaConfig = async () => {
    setIsSavingMeta(true);
    try {
      const response = await fetch(`${apiUrl}/api/auth/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          whatsappProvider: 'OFFICIAL',
          whatsappConfig: config
        })
      });
      if (response.ok) {
        useToastStore.getState().addToast('Configurações da Meta salvas!', 'success');
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (e) {
      console.error(e);
      useToastStore.getState().addToast('Erro ao salvar configurações.', 'error');
    } finally {
      setIsSavingMeta(false);
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
    <div className="flex-1 overflow-y-auto hide-scrollbar h-full px-2">
      <div className="w-full max-w-3xl p-5 md:p-8 bg-white/40 dark:bg-black/40 backdrop-blur-3xl border border-black/10 dark:border-white/10 flex flex-col shadow-2xl rounded-[2rem] mx-auto my-4 md:my-10 shrink-0">
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4 mb-4 md:pb-6 md:mb-6">
          <div>
            <h2 className="font-podium text-2xl md:text-3xl uppercase tracking-widest text-black dark:text-white flex items-center gap-3">
              <Settings2 className="w-8 h-8" />
              Conexões
            </h2>
            <p className="font-inter text-sm text-black/60 dark:text-white/60 uppercase tracking-widest mt-2">
              Configurações de Mensageria e WhatsApp
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="w-full">
          {/* Tabs */}
          <div className="flex flex-col sm:flex-row gap-2 mb-6">
            <button
              onClick={() => setProvider('EVOLUTION')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-all ${
                provider === 'EVOLUTION'
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg scale-[1.02]'
                  : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
              }`}
            >
              <Smartphone size={16} />
              API Não Oficial (Baileys)
            </button>
            <button
              onClick={() => setProvider('OFFICIAL')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-all ${
                provider === 'OFFICIAL'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-[1.02]'
                  : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
              }`}
            >
              <Cloud size={16} />
              API Oficial (Meta Cloud)
            </button>
          </div>

          {provider === 'EVOLUTION' ? (
            <div className="flex flex-col lg:flex-row gap-6 animate-fade-in">
               <div className="w-full lg:w-64 lg:h-64 shrink-0 bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-3xl p-4 flex items-center justify-center relative shadow-inner group aspect-square lg:aspect-auto">
                   {qrCode ? (
                     <img src={qrCode} alt="QR Code" className="w-full h-full object-contain rounded-2xl" />
                   ) : (
                     <div className="w-full h-full border border-dashed border-black/20 dark:border-white/20 flex flex-col gap-3 items-center justify-center text-center p-4 rounded-2xl bg-black/5 dark:bg-black/40">
                       <Smartphone className="w-8 h-8 text-black/20 dark:text-white/20" />
                       <span className="font-inter text-[9px] text-black/40 dark:text-white/40 font-bold uppercase tracking-widest leading-relaxed">
                         {instanceStatus === 'Conectado' ? 'Instância Conectada' : 'Nenhum QR Code Gerado'}
                       </span>
                     </div>
                   )}
               </div>
               
               <div className="flex-1 w-full flex flex-col gap-4">
                 {/* Status Section */}
                 <div className="flex items-center justify-between bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 p-5 rounded-3xl shadow-sm">
                    <div className="flex items-center gap-4">
                       <div className={`w-3 h-3 rounded-full shadow-lg ${instanceStatus === 'Conectado' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-amber-500 animate-pulse shadow-amber-500/50'}`}></div>
                       <div>
                         <p className="font-podium text-[10px] md:text-xs uppercase tracking-widest text-black/50 dark:text-white/50 mb-0.5">Status da Conexão</p>
                         <h4 className="font-inter font-bold text-black dark:text-white tracking-wider text-sm md:text-base">{instanceStatus}</h4>
                       </div>
                    </div>
                    {instanceStatus === 'Conectado' && (
                       <button onClick={handleDisconnectInstance} className="text-[10px] uppercase tracking-widest font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center gap-2 shadow-sm">
                         Desconectar
                       </button>
                    )}
                 </div>

                 {/* Settings Section */}
                 <div className="flex flex-col gap-3 bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 p-5 rounded-3xl shadow-sm">
                    {instanceStatus !== 'Conectado' && (
                      <button 
                        onClick={handleConnectInstance}
                        disabled={isChecking}
                        className="w-full bg-black dark:bg-white text-white dark:text-black px-6 py-3 text-[10px] uppercase tracking-widest font-bold rounded-xl disabled:opacity-50 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 shadow-xl mt-1"
                      >
                        <Smartphone size={16} />
                        {isChecking ? 'Gerando QR Code...' : 'Gerar QR Code de Conexão'}
                      </button>
                    )}
                 </div>

                 {/* Instructions */}
                 <div className="bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 p-5 rounded-3xl text-xs font-inter mt-auto shadow-sm">
                    <strong className="flex items-center gap-2 uppercase tracking-widest text-[10px] mb-4 text-black dark:text-white">
                      <div className="w-1.5 h-1.5 rounded-full bg-black/40 dark:bg-white/40"></div>
                      Como conectar o dispositivo:
                    </strong>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-black/60 dark:text-white/60 font-medium">
                      <div className="space-y-2">
                        <p>1. Abra o WhatsApp no seu celular</p>
                        <p>2. Clique nos três pontinhos (⋮) ou Configurações</p>
                        <p>3. Vá em <strong className="text-black/80 dark:text-white/80 font-bold">Dispositivos Conectados</strong></p>
                      </div>
                      <div className="space-y-2">
                        <p>4. Clique em <strong className="text-black/80 dark:text-white/80 font-bold">Conectar Dispositivo</strong></p>
                        <p>5. Aponte a câmera para o QR Code ao lado</p>
                      </div>
                    </div>
                 </div>
               </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 animate-fade-in bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 p-5 md:p-8 rounded-3xl shadow-sm">
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-black/60 dark:text-white/60 mb-1.5">
                    Phone Number ID (ID do Número)
                  </label>
                  <input
                    type="text"
                    value={config.phoneNumberId || ''}
                    onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                    className="w-full bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm font-medium text-black dark:text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                    placeholder="Ex: 123456789012345"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-black/60 dark:text-white/60 mb-1.5">
                    Access Token (Token Temporário)
                  </label>
                  <input
                    type="password"
                    value={config.accessToken || ''}
                    onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                    className="w-full bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm font-medium text-black dark:text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                    placeholder="EAAB..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-black/60 dark:text-white/60 mb-1.5">
                    WABA ID (WhatsApp Business Account ID) - Opcional
                  </label>
                  <input
                    type="text"
                    value={config.wabaId || ''}
                    onChange={(e) => setConfig({ ...config, wabaId: e.target.value })}
                    className="w-full bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm font-medium text-black dark:text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                    placeholder="Ex: 123456789012345"
                  />
                </div>
              </div>
              
              <button
                onClick={handleSaveMetaConfig}
                disabled={isSavingMeta}
                className="w-full bg-blue-600 text-white px-6 py-4 text-xs uppercase tracking-widest font-bold rounded-xl disabled:opacity-50 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 mt-2"
              >
                <Save size={18} />
                {isSavingMeta ? 'Salvando...' : 'Salvar Configurações da Meta'}
              </button>

              <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl text-xs font-inter mt-2">
                <strong className="flex items-center gap-2 uppercase tracking-widest text-[10px] mb-3 text-blue-700 dark:text-blue-400">
                  <Cloud size={14} />
                  Aviso de Disparos em Massa (Meta)
                </strong>
                <p className="text-black/70 dark:text-white/70 leading-relaxed font-medium">
                  Ao usar a API Oficial, o envio de disparos (broadcasts) para clientes fora da janela de 24 horas requer <b className="text-black dark:text-white">Templates Aprovados</b> pelo WhatsApp. Se enviar textos livres, a mensagem pode falhar.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
