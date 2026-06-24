import { useState, useRef, useEffect, useMemo, useDeferredValue } from 'react';
import axios from 'axios';
import { Play, Pause, Square, Users, Settings, MessageSquare, Image as ImageIcon, Plug, ArrowRight, UserPlus, Search, CheckCircle2, AlertCircle } from 'lucide-react';

interface Contact {
  id: string;
  name?: string;
  number: string;
  status?: 'pending' | 'sent' | 'error';
}

interface LogEntry {
  id: number;
  text: string;
  status: 'pending' | 'success' | 'error';
  timestamp: Date;
}

export default function BroadcastManager() {
  const [currentScreen, setCurrentScreen] = useState<1 | 2 | 3>(1);
  const [providerInfo, setProviderInfo] = useState<any>(null);
  
  // Contacts State
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [selectedAllContacts, setSelectedAllContacts] = useState<Set<string>>(new Set());
  const [searchAll, setSearchAll] = useState('');
  
  const [targetContacts, setTargetContacts] = useState<Contact[]>([]);
  const [selectedTargetContacts, setSelectedTargetContacts] = useState<Set<string>>(new Set());
  const [searchTarget, setSearchTarget] = useState('');

  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // Message State
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  
  // Broadcast State
  const [isSending, setIsSending] = useState(false);
  const [isPausedUI, setIsPausedUI] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const [minDelay, setMinDelay] = useState(10);
  const [maxDelay, setMaxDelay] = useState(25);

  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Fetch Connection Data
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/auth/settings`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setProviderInfo(res.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchConfig();
  }, [apiUrl]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (text: string, status: 'pending' | 'success' | 'error') => {
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), text, status, timestamp: new Date() }]);
  };

  const fetchDatabaseContacts = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/broadcast/customers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const fetched = res.data.map((c: any) => ({
        id: c.number,
        name: c.name,
        number: c.number,
        status: 'pending'
      }));
      
      const uniqueMap = new Map<string, Contact>();
      fetched.forEach((c: Contact) => uniqueMap.set(c.id, c));
      setAllContacts(Array.from(uniqueMap.values()));
    } catch (e) {
      alert("Erro ao buscar clientes do banco de dados.");
    }
  };

  const handleAddNewContact = () => {
    if (!newContactPhone.trim()) {
      alert("O telefone é obrigatório.");
      return;
    }
    const cleanPhone = newContactPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      alert("Número de telefone inválido.");
      return;
    }
    
    const newContact: Contact = {
      id: cleanPhone,
      name: newContactName.trim() || undefined,
      number: cleanPhone,
      status: 'pending'
    };
    
    if (targetContacts.some(c => c.id === newContact.id)) {
       alert("Este número já está na lista alvo.");
       return;
    }
    
    setTargetContacts(prev => [newContact, ...prev]);
    setNewContactName('');
    setNewContactPhone('');
    setShowNewContactForm(false);
  };

  // --- Filtering ---
  const deferredSearchAll = useDeferredValue(searchAll);
  const deferredSearchTarget = useDeferredValue(searchTarget);

  const filteredAllContacts = useMemo(() => {
    const searchLower = deferredSearchAll.toLowerCase();
    return allContacts.filter(c => 
      c.name?.toLowerCase().includes(searchLower) || 
      c.number.includes(deferredSearchAll)
    );
  }, [allContacts, deferredSearchAll]);

  const filteredTargetContacts = useMemo(() => {
    const searchLower = deferredSearchTarget.toLowerCase();
    return targetContacts.filter(c => 
      c.name?.toLowerCase().includes(searchLower) || 
      c.number.includes(deferredSearchTarget)
    );
  }, [targetContacts, deferredSearchTarget]);

  // --- Selections ---
  const toggleAllSelection = (id: string) => {
    const newSelected = new Set(selectedAllContacts);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedAllContacts(newSelected);
  };
  const toggleAllAllSelection = () => {
    if (selectedAllContacts.size === filteredAllContacts.length && filteredAllContacts.length > 0) {
      setSelectedAllContacts(new Set());
    } else {
      setSelectedAllContacts(new Set(filteredAllContacts.map(c => c.id)));
    }
  };
  const moveSelectedToTarget = () => {
    const toAdd = allContacts.filter(c => selectedAllContacts.has(c.id));
    const newTarget = [...targetContacts];
    toAdd.forEach(contact => {
      if (!newTarget.find(t => t.id === contact.id)) {
        newTarget.push({ ...contact, status: 'pending' });
      }
    });
    setTargetContacts(newTarget);
    setSelectedAllContacts(new Set());
  };

  const toggleTargetSelection = (id: string) => {
    const newSelected = new Set(selectedTargetContacts);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedTargetContacts(newSelected);
  };
  const toggleAllTargetSelection = () => {
    if (selectedTargetContacts.size === filteredTargetContacts.length && filteredTargetContacts.length > 0) {
      setSelectedTargetContacts(new Set());
    } else {
      setSelectedTargetContacts(new Set(filteredTargetContacts.map(c => c.id)));
    }
  };
  const removeSelectedFromTarget = () => {
    const newTarget = targetContacts.filter(c => !selectedTargetContacts.has(c.id));
    setTargetContacts(newTarget);
    setSelectedTargetContacts(new Set());
  };

  const startBroadcast = async () => {
    if (targetContacts.length === 0) {
      alert('A lista alvo está vazia.');
      return;
    }
    if (!message.trim() && !mediaUrl.trim()) {
      alert('Digite uma mensagem ou adicione uma mídia para enviar.');
      return;
    }

    setIsSending(true);
    setIsPausedUI(false);
    isPausedRef.current = false;
    isCancelledRef.current = false;
    addLog(`Iniciando disparo para ${targetContacts.length} contatos...`, 'pending');

    let sentCount = 0;
    const currentContacts = [...targetContacts];

    for (let i = 0; i < currentContacts.length; i++) {
      while (isPausedRef.current && !isCancelledRef.current) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      if (isCancelledRef.current) {
        addLog('Disparo cancelado pelo usuário.', 'error');
        break;
      }

      const contact = currentContacts[i];
      currentContacts[i] = { ...contact, status: 'pending' };
      setTargetContacts([...currentContacts]);
      
      try {
        const personalizedMessage = message.replace(/{nome}/gi, contact.name || 'cliente');

        const payload = {
          number: contact.number,
          text: personalizedMessage,
          mediaUrl: mediaUrl.trim() || undefined,
          mediaType: mediaUrl.trim() ? mediaType : undefined
        };

        const res = await axios.post(`${apiUrl}/api/broadcast/send`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });

        if (res.data.success) {
           currentContacts[i] = { ...contact, status: 'sent' };
           sentCount++;
           addLog(`Enviado para ${contact.name || contact.number}`, 'success');
        } else {
           throw new Error('Falha no envio');
        }
      } catch (error: any) {
        currentContacts[i] = { ...contact, status: 'error' };
        addLog(`Erro ao enviar para ${contact.number}: ${error?.response?.data?.error || error.message}`, 'error');
      }
      
      setTargetContacts([...currentContacts]);

      // Anti-ban delay
      if (i < currentContacts.length - 1) {
        if (isCancelledRef.current) {
           addLog('Disparo cancelado pelo usuário.', 'error');
           break;
        }
        const delayMs = Math.floor(Math.random() * ((maxDelay * 1000) - (minDelay * 1000) + 1)) + (minDelay * 1000);
        const delaySeconds = (delayMs / 1000).toFixed(1);
        addLog(`Aguardando ${delaySeconds}s (Anti-Ban)...`, 'pending');
        
        let waited = 0;
        while (waited < delayMs) {
          if (isCancelledRef.current) break;
          while (isPausedRef.current && !isCancelledRef.current) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          if (isCancelledRef.current) break;
          await new Promise(resolve => setTimeout(resolve, 500));
          waited += 500;
        }
        if (isCancelledRef.current) {
           addLog('Disparo cancelado pelo usuário.', 'error');
           break;
        }
      }
    }

    addLog(`Disparo concluído! ${sentCount} mensagens enviadas.`, 'success');
    setIsSending(false);
  };

  const nextScreen = (screen: 1 | 2 | 3) => {
    if (screen === 2 && allContacts.length === 0) {
      fetchDatabaseContacts();
    }
    setCurrentScreen(screen);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden animate-fade-up rounded-3xl lg:m-2">
      
      {/* SIDEBAR WIZARD */}
      <aside className="w-full lg:w-24 lg:h-full shrink-0 flex flex-row lg:flex-col items-center justify-center lg:justify-start gap-4 lg:gap-8 px-6 py-4 lg:py-10 border-b lg:border-b-0 lg:border-r border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
        <button 
          onClick={() => setCurrentScreen(1)} 
          className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${currentScreen === 1 ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg scale-110' : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10'}`}
          title="1. Conexão"
        >
          {currentScreen === 1 && <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-black dark:bg-white rounded-r-md"></div>}
          <div className="flex flex-col items-center gap-1">
            <Plug size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Conexão</span>
          </div>
        </button>

        <button 
          onClick={() => nextScreen(2)} 
          className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${currentScreen === 2 ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg scale-110' : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10'}`}
          title="2. Alvos"
        >
          {currentScreen === 2 && <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-black dark:bg-white rounded-r-md"></div>}
          <div className="flex flex-col items-center gap-1">
            <Users size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Alvos</span>
          </div>
        </button>

        <button 
          onClick={() => nextScreen(3)} 
          className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${currentScreen === 3 ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg scale-110' : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10'}`}
          title="3. Disparo"
        >
          {currentScreen === 3 && <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-black dark:bg-white rounded-r-md"></div>}
          <div className="flex flex-col items-center gap-1">
            <MessageSquare size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Disparo</span>
          </div>
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-hidden flex flex-col p-6 lg:p-10 relative">
        
        {/* SCREEN 1: CONNECTION */}
        {currentScreen === 1 && (
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xl mx-auto animate-fade-in">
            <h1 className="font-podium text-4xl lg:text-5xl uppercase tracking-widest text-black dark:text-white mb-10 text-center">
              Status da Conexão
            </h1>

            <div className="w-full bg-white/60 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10 p-8 rounded-3xl shadow-xl flex flex-col items-center text-center">
              {providerInfo?.whatsappProvider === 'OFFICIAL' ? (
                 <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 text-emerald-500 border border-emerald-500/20">
                   <Plug size={40} />
                 </div>
              ) : (
                 <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 text-blue-500 border border-blue-500/20">
                   <Plug size={40} />
                 </div>
              )}
              
              <h2 className="font-inter text-xl font-bold uppercase tracking-widest text-black dark:text-white mb-2">
                {providerInfo?.whatsappProvider === 'OFFICIAL' ? 'API Oficial Meta' : 'Evolution API'}
              </h2>
              
              {providerInfo?.whatsappProvider === 'EVOLUTION' && providerInfo?.whatsappConfig ? (
                <p className="text-sm font-inter text-black/60 dark:text-white/60 mb-8 max-w-xs">
                  Instância: <strong className="text-black dark:text-white">{JSON.parse(providerInfo.whatsappConfig).instanceName || 'N/A'}</strong>
                </p>
              ) : providerInfo?.whatsappProvider === 'OFFICIAL' && providerInfo?.whatsappConfig ? (
                <p className="text-sm font-inter text-black/60 dark:text-white/60 mb-8 max-w-xs">
                  ID do Telefone: <strong className="text-black dark:text-white">{JSON.parse(providerInfo.whatsappConfig).phoneNumberId || 'N/A'}</strong>
                </p>
              ) : (
                <p className="text-sm font-inter text-red-500 mb-8 max-w-xs bg-red-500/10 px-4 py-2 rounded-xl">
                  API não configurada! Vá na aba "Conexões" para configurar.
                </p>
              )}

              <button 
                onClick={() => nextScreen(2)}
                className="w-full bg-black dark:bg-white text-white dark:text-black font-inter tracking-widest text-xs font-bold uppercase py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform"
              >
                Avançar para Alvos <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 2: TARGETS */}
        {currentScreen === 2 && (
          <div className="flex-1 flex flex-col lg:flex-row gap-6 w-full h-full overflow-hidden animate-fade-in">
            
            {/* LEFT COLUMN: Source Contacts */}
            <div className="flex-1 flex flex-col bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-3xl overflow-hidden">
              <div className="p-5 border-b border-black/10 dark:border-white/10 flex flex-col gap-4 bg-white/30 dark:bg-black/30 backdrop-blur-md">
                <div className="flex justify-between items-center">
                  <h2 className="font-podium text-lg uppercase tracking-widest text-black dark:text-white">Meus Clientes (Pedidos)</h2>
                  <button 
                    onClick={fetchDatabaseContacts}
                    className="bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2 text-[10px] font-inter font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-black dark:text-white"
                  >
                    <Users size={14} /> Sincronizar
                  </button>
                </div>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
                  <input 
                    type="text" 
                    value={searchAll}
                    onChange={(e) => setSearchAll(e.target.value)}
                    placeholder="Pesquisar clientes..."
                    className="w-full bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-black dark:text-white focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-all font-inter"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 hide-scrollbar">
                {allContacts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-black/40 dark:text-white/40 text-center p-6">
                    <Users size={32} className="mb-4 opacity-50" />
                    <p className="text-sm font-inter">Nenhum cliente carregado.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center px-3 py-2 text-[10px] uppercase tracking-wider text-black/70 dark:text-white/70 font-bold sticky top-0 bg-white/90 dark:bg-black/90 backdrop-blur-md border border-black/5 dark:border-white/5 rounded-lg mb-2 z-10">
                      <input 
                        type="checkbox" 
                        checked={allContacts.length > 0 && selectedAllContacts.size === filteredAllContacts.length}
                        onChange={toggleAllAllSelection}
                        className="mr-3 w-4 h-4 accent-black dark:accent-white cursor-pointer"
                      />
                      <div className="flex-1">Todos ({filteredAllContacts.length})</div>
                    </div>
                    
                    {filteredAllContacts.map(contact => (
                      <div key={contact.id} onClick={() => toggleAllSelection(contact.id)} className={`rounded-xl p-3 flex items-center transition-colors cursor-pointer border ${selectedAllContacts.has(contact.id) ? 'bg-black/10 dark:bg-white/10 border-black/20 dark:border-white/20' : 'bg-white/40 dark:bg-black/40 border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                        <input 
                          type="checkbox" 
                          checked={selectedAllContacts.has(contact.id)}
                          readOnly
                          className="mr-3 w-4 h-4 accent-black dark:accent-white cursor-pointer"
                        />
                        <div className="flex-1 flex flex-col min-w-0">
                          <span className="text-sm font-medium text-black dark:text-white font-inter truncate">{contact.name || 'Desconhecido'}</span>
                          <span className="text-[10px] text-black/50 dark:text-white/50 font-inter tracking-widest mt-1">{contact.number}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-black/10 dark:border-white/10 bg-white/30 dark:bg-black/30 backdrop-blur-md mt-auto">
                <button 
                  onClick={moveSelectedToTarget}
                  disabled={selectedAllContacts.size === 0}
                  className="w-full bg-black dark:bg-white text-white dark:text-black rounded-xl py-4 flex items-center justify-center gap-2 transition-all disabled:opacity-50 font-bold font-inter tracking-widest text-[10px] uppercase"
                >
                  Adicionar à Lista Alvo <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Target Contacts */}
            <div className="flex-1 flex flex-col bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-3xl overflow-hidden">
              <div className="p-5 border-b border-black/10 dark:border-white/10 flex flex-col gap-4 bg-white/30 dark:bg-black/30 backdrop-blur-md">
                <div className="flex justify-between items-center">
                  <h2 className="font-podium text-lg uppercase tracking-widest text-black dark:text-white flex items-center gap-3">
                    Lista Alvo
                    <span className="bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 rounded-lg text-[10px] font-inter">
                      {targetContacts.length}
                    </span>
                  </h2>
                  <button 
                    onClick={() => setShowNewContactForm(!showNewContactForm)}
                    className="bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] font-inter font-bold uppercase tracking-widest flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-black dark:text-white"
                  >
                    <UserPlus size={14} /> Adicionar
                  </button>
                </div>

                {showNewContactForm && (
                  <div className="bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 p-4 rounded-2xl flex flex-col gap-3 animate-fade-in">
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        placeholder="Nome (opcional)"
                        className="flex-1 w-1/2 bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none font-inter"
                      />
                      <input 
                        type="text" 
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        placeholder="5511999999999"
                        className="flex-1 w-1/2 bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none font-inter"
                      />
                    </div>
                    <div className="flex justify-end gap-3 mt-1">
                      <button onClick={() => setShowNewContactForm(false)} className="text-[10px] text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white uppercase font-bold font-inter tracking-widest px-2">Cancelar</button>
                      <button onClick={handleAddNewContact} className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl text-[10px] uppercase font-bold font-inter tracking-widest transition-colors">Salvar</button>
                    </div>
                  </div>
                )}
                
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
                  <input 
                    type="text" 
                    value={searchTarget}
                    onChange={(e) => setSearchTarget(e.target.value)}
                    placeholder="Filtrar na lista alvo..."
                    className="w-full bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-black dark:text-white focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-all font-inter"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 hide-scrollbar">
                {targetContacts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-black/40 dark:text-white/40 text-center p-6">
                    <Users size={32} className="mb-4 opacity-50" />
                    <p className="text-sm font-inter">A lista alvo está vazia.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center px-3 py-2 text-[10px] uppercase tracking-wider text-black/70 dark:text-white/70 font-bold sticky top-0 bg-white/90 dark:bg-black/90 backdrop-blur-md border border-black/5 dark:border-white/5 rounded-lg mb-2 z-10">
                      <input 
                        type="checkbox" 
                        checked={targetContacts.length > 0 && selectedTargetContacts.size === filteredTargetContacts.length}
                        onChange={toggleAllTargetSelection}
                        className="mr-3 w-4 h-4 accent-black dark:accent-white cursor-pointer"
                      />
                      <div className="flex-1">Todos ({filteredTargetContacts.length})</div>
                      {selectedTargetContacts.size > 0 && (
                        <button onClick={removeSelectedFromTarget} className="text-red-500 font-bold hover:underline ml-2">Remover Selecionados</button>
                      )}
                    </div>
                    
                    {filteredTargetContacts.map(contact => (
                      <div key={contact.id} onClick={() => toggleTargetSelection(contact.id)} className={`rounded-xl p-3 flex items-center transition-colors cursor-pointer border ${selectedTargetContacts.has(contact.id) ? 'bg-red-500/10 border-red-500/30' : 'bg-white/40 dark:bg-black/40 border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                        <input 
                          type="checkbox" 
                          checked={selectedTargetContacts.has(contact.id)}
                          readOnly
                          className="mr-3 w-4 h-4 accent-red-500 cursor-pointer"
                        />
                        <div className="flex-1 flex flex-col min-w-0">
                          <span className="text-sm font-medium text-black dark:text-white font-inter truncate">{contact.name || 'Desconhecido'}</span>
                          <span className="text-[10px] text-black/50 dark:text-white/50 font-inter tracking-widest mt-1">{contact.number}</span>
                        </div>
                        {contact.status === 'sent' && <CheckCircle2 size={16} className="text-green-500 ml-2" />}
                        {contact.status === 'error' && <AlertCircle size={16} className="text-red-500 ml-2" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-black/10 dark:border-white/10 bg-white/30 dark:bg-black/30 backdrop-blur-md mt-auto">
                <button 
                  onClick={() => nextScreen(3)}
                  disabled={targetContacts.length === 0}
                  className="w-full bg-black dark:bg-white text-white dark:text-black rounded-xl py-4 flex items-center justify-center gap-2 transition-all disabled:opacity-50 font-bold font-inter tracking-widest text-[10px] uppercase"
                >
                  Avançar para Disparo <ArrowRight size={16} />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* SCREEN 3: BROADCAST */}
        {currentScreen === 3 && (
          <div className="flex-1 flex flex-col lg:flex-row gap-6 w-full h-full overflow-hidden animate-fade-in">
            {/* Left Config Panel */}
            <div className="flex-1 flex flex-col gap-6 overflow-y-auto hide-scrollbar">
              <div className="bg-black/5 dark:bg-white/5 p-6 rounded-3xl border border-black/10 dark:border-white/10 shadow-sm">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="font-podium text-lg uppercase tracking-widest text-black dark:text-white flex items-center gap-2">
                    <MessageSquare size={20} /> Mensagem
                  </h3>
                  <button 
                    onClick={() => setMessage(prev => prev + '{nome}')}
                    className="text-[10px] bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white font-bold font-inter tracking-widest px-3 py-1.5 rounded-lg transition-colors uppercase"
                  >
                    + Variável {'{nome}'}
                  </button>
                 </div>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Olá {nome}, preparamos uma oferta especial..."
                  className="w-full bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-4 text-black dark:text-white font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors resize-none rounded-2xl h-40"
                />
              </div>

              <div className="bg-black/5 dark:bg-white/5 p-6 rounded-3xl border border-black/10 dark:border-white/10 shadow-sm">
                 <h3 className="font-podium text-lg uppercase tracking-widest text-black dark:text-white mb-4 flex items-center gap-2">
                  <ImageIcon size={20} /> Mídia <span className="text-xs text-black/50 dark:text-white/50 font-inter">(Opcional)</span>
                </h3>
                <div className="flex flex-col md:flex-row gap-4">
                  <select 
                    value={mediaType} 
                    onChange={e => setMediaType(e.target.value as any)}
                    className="md:w-1/3 bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-4 text-black dark:text-white font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white rounded-2xl"
                  >
                    <option value="image">Imagem (URL)</option>
                    <option value="video">Vídeo (URL)</option>
                  </select>
                  <input
                    type="text"
                    value={mediaUrl}
                    onChange={e => setMediaUrl(e.target.value)}
                    placeholder="Cole aqui a URL direta do arquivo..."
                    className="flex-1 bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-4 text-black dark:text-white font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-2xl"
                  />
                </div>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/30 p-6 rounded-3xl shadow-sm">
                 <h3 className="font-podium text-lg uppercase tracking-widest text-orange-700 dark:text-orange-500 mb-4 flex items-center gap-2">
                  <Settings size={20} /> Anti-Banimento <span className="text-xs font-inter">(Atraso)</span>
                </h3>
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-orange-700 dark:text-orange-500 block mb-2">Mínimo (segundos)</label>
                    <input type="number" value={minDelay} onChange={e => setMinDelay(Number(e.target.value))} className="w-full bg-white/50 dark:bg-black/50 border border-orange-500/50 p-4 rounded-2xl text-sm outline-none text-black dark:text-white" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-orange-700 dark:text-orange-500 block mb-2">Máximo (segundos)</label>
                    <input type="number" value={maxDelay} onChange={e => setMaxDelay(Number(e.target.value))} className="w-full bg-white/50 dark:bg-black/50 border border-orange-500/50 p-4 rounded-2xl text-sm outline-none text-black dark:text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Controls & Logs */}
            <div className="flex-1 flex flex-col gap-6 h-full">
              
              {/* Logs */}
              <div className="flex-1 bg-black/90 dark:bg-[#050505] p-5 rounded-3xl border border-black/20 dark:border-white/10 font-mono text-xs overflow-y-auto flex flex-col gap-2 shadow-2xl relative min-h-[250px]">
                <div className="absolute top-4 right-5 text-[10px] text-white/30 uppercase tracking-widest font-bold">Activity Log</div>
                <div className="mt-6">
                  {logs.length === 0 && <div className="text-white/30 italic">Nenhuma atividade ainda...</div>}
                  {logs.map(log => (
                    <div key={log.id} className={`mb-1
                      ${log.status === 'success' ? 'text-green-400' : ''}
                      ${log.status === 'error' ? 'text-red-400' : ''}
                      ${log.status === 'pending' ? 'text-blue-300' : ''}
                    `}>
                      <span className="text-white/40 mr-2">[{log.timestamp.toLocaleTimeString()}]</span> 
                      {log.text}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-4">
                {!isSending ? (
                  <button
                    onClick={startBroadcast}
                    className="flex-1 bg-black dark:bg-white text-white dark:text-black font-inter tracking-widest text-[12px] font-bold uppercase py-5 rounded-2xl flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-xl"
                  >
                    <Play size={20} fill="currentColor" />
                    Iniciar Disparo
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        isPausedRef.current = !isPausedRef.current;
                        setIsPausedUI(isPausedRef.current);
                        addLog(isPausedRef.current ? 'Disparo pausado.' : 'Disparo retomado.', 'pending');
                      }}
                      className="flex-1 bg-yellow-500 text-white font-inter tracking-widest text-[12px] font-bold uppercase py-5 rounded-2xl flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-xl"
                    >
                      {isPausedUI ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                      {isPausedUI ? 'Retomar' : 'Pausar'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Tem certeza que deseja cancelar o disparo?')) {
                          isCancelledRef.current = true;
                          addLog('Cancelando...', 'error');
                        }
                      }}
                      className="flex-1 bg-red-500 text-white font-inter tracking-widest text-[12px] font-bold uppercase py-5 rounded-2xl flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-xl"
                    >
                      <Square size={20} fill="currentColor" />
                      Cancelar
                    </button>
                  </>
                )}
              </div>
              
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
