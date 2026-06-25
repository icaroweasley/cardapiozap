import { useState, useRef, useEffect, useMemo, useDeferredValue } from 'react';
import axios from 'axios';
import { Play, Pause, Square, Users, MessageSquare, Plug, ArrowRight, UserPlus, Search, CheckCircle2, AlertCircle, Trash2, ArrowLeft, Save, FolderOpen } from 'lucide-react';

const createSleepWorker = () => {
  if (typeof window === 'undefined') return null;
  const code = `
    self.onmessage = function(e) {
      setTimeout(() => self.postMessage(e.data.id), e.data.delay);
    };
  `;
  const blob = new Blob([code], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

let sleepWorker: Worker | null = null;
let sleepIdCounter = 0;

const unthrottledSleep = (ms: number): Promise<void> => {
  if (typeof window === 'undefined') return new Promise(r => setTimeout(r, ms));
  if (!sleepWorker) sleepWorker = createSleepWorker();
  
  return new Promise(resolve => {
    if (!sleepWorker) {
      setTimeout(resolve, ms);
      return;
    }
    const id = ++sleepIdCounter;
    const handler = (e: MessageEvent) => {
      if (e.data === id) {
        sleepWorker!.removeEventListener('message', handler);
        resolve();
      }
    };
    sleepWorker.addEventListener('message', handler);
    sleepWorker.postMessage({ id, delay: ms });
  });
};
interface Contact {
  id: string;
  name?: string;
  number: string;
  status?: 'pending' | 'sent' | 'error';
}

interface SavedList {
  id: string;
  name: string;
  contacts: Contact[];
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

  // Saved Lists State
  const [savedLists, setSavedLists] = useState<SavedList[]>([]);
  const [saveListName, setSaveListName] = useState('');
  const [selectedListId, setSelectedListId] = useState('');

  // Message State
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  
  // Broadcast State
  const [isSending, setIsSending] = useState(false);
  const [isPausedUI, setIsPausedUI] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const [minDelay] = useState(10);
  const [maxDelay] = useState(25);

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

  const configObj = useMemo(() => {
    if (!providerInfo?.whatsappConfig) return {};
    if (typeof providerInfo.whatsappConfig === 'object') return providerInfo.whatsappConfig;
    try {
      return JSON.parse(providerInfo.whatsappConfig);
    } catch {
      return {};
    }
  }, [providerInfo]);

  // Load Saved Lists
  useEffect(() => {
    const lists = localStorage.getItem('broadcast_saved_lists');
    if (lists) setSavedLists(JSON.parse(lists));
  }, []);

  const saveCurrentList = () => {
    if (!saveListName.trim()) return alert('Digite um nome para salvar a lista.');
    if (targetContacts.length === 0) return alert('A lista alvo está vazia.');
    const newList: SavedList = { id: Date.now().toString(), name: saveListName, contacts: targetContacts };
    const updated = [...savedLists, newList];
    setSavedLists(updated);
    localStorage.setItem('broadcast_saved_lists', JSON.stringify(updated));
    setSaveListName('');
    alert('Lista salva com sucesso!');
  };

  const loadList = (id: string) => {
    setSelectedListId(id);
    if (!id) return;
    const list = savedLists.find(l => l.id === id);
    if (list) {
      const existingIds = new Set(targetContacts.map(c => c.id));
      const toAdd = list.contacts.filter(c => !existingIds.has(c.id));
      if (toAdd.length > 0) {
        setTargetContacts(prev => [...prev, ...toAdd]);
      }
    }
    // reset select
    setTimeout(() => setSelectedListId(''), 100);
  };
  
  const deleteSavedList = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja apagar esta lista salva?')) return;
    const updated = savedLists.filter(l => l.id !== id);
    setSavedLists(updated);
    localStorage.setItem('broadcast_saved_lists', JSON.stringify(updated));
  };

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
           await unthrottledSleep(1000); // 1s cooldown
           addLog('Disparo cancelado pelo usuário.', 'error');
           break;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const delayMs = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay) * 1000;
        const delaySeconds = (delayMs / 1000).toFixed(1);
        addLog(`Aguardando ${delaySeconds}s (Anti-Ban)...`, 'pending');
        
        let waited = 0;
        while (waited < delayMs) {
          if (isCancelledRef.current) break;
          while (isPausedRef.current && !isCancelledRef.current) {
            await unthrottledSleep(100);
          }
          if (isCancelledRef.current) break;
          await unthrottledSleep(500);
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
    <div className="flex-1 flex flex-col lg:flex-row h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden animate-fade-up rounded-[2rem] lg:m-2">
      
      {/* SIDEBAR WIZARD */}
      <aside className="w-full lg:w-24 lg:h-full shrink-0 flex flex-row lg:flex-col items-center justify-center lg:justify-start gap-4 lg:gap-8 px-6 py-4 lg:py-10 border-b lg:border-b-0 lg:border-r border-black/10 dark:border-white/10 bg-white/20 dark:bg-black/20">
        <button 
          onClick={() => setCurrentScreen(1)} 
          className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${currentScreen === 1 ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg scale-110' : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10'}`}
          title="1. Conexão"
        >
          <div className="flex flex-col items-center gap-1">
            <Plug size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wider font-inter">Conexão</span>
          </div>
        </button>

        <button 
          onClick={() => nextScreen(2)} 
          className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${currentScreen === 2 ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg scale-110' : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10'}`}
          title="2. Alvos"
        >
          <div className="flex flex-col items-center gap-1">
            <Users size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wider font-inter">Alvos</span>
          </div>
        </button>

        <button 
          onClick={() => nextScreen(3)} 
          className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${currentScreen === 3 ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg scale-110' : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10'}`}
          title="3. Disparo"
        >
          <div className="flex flex-col items-center gap-1">
            <MessageSquare size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wider font-inter">Disparo</span>
          </div>
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-hidden flex flex-col p-6 lg:p-10 relative z-10">
        
        {/* SCREEN 1: CONNECTION */}
        {currentScreen === 1 && (
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xl mx-auto animate-fade-in">
            <h1 className="font-podium text-4xl lg:text-5xl uppercase tracking-widest text-black dark:text-white mb-10 text-center">
              CONECTE SUA INSTÂNCIA
            </h1>

            <div className="w-full bg-white/60 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10 p-8 rounded-[2rem] shadow-xl flex flex-col items-center text-center">
              {(!providerInfo?.whatsappProvider || !providerInfo?.whatsappConfig) ? (
                 <>
                   <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 text-red-500 border border-red-500/20 shadow-lg">
                     <AlertCircle size={40} />
                   </div>
                   <h2 className="font-podium text-xl uppercase tracking-widest text-black dark:text-white mb-2">
                     Nenhuma Conexão
                   </h2>
                   <p className="text-sm font-inter text-red-500 mb-8 max-w-xs bg-red-500/10 px-4 py-3 rounded-xl border border-red-500/20">
                     API não configurada! Vá na aba <strong>Conexões</strong> para configurar o seu WhatsApp.
                   </p>
                 </>
              ) : (
                 <>
                   {providerInfo.whatsappProvider === 'OFFICIAL' ? (
                      <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 text-emerald-500 border border-emerald-500/20 shadow-lg">
                        <Plug size={40} />
                      </div>
                   ) : (
                      <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 text-blue-500 border border-blue-500/20 shadow-lg">
                        <Plug size={40} />
                      </div>
                   )}
                   
                   <h2 className="font-podium text-xl uppercase tracking-widest text-black dark:text-white mb-2">
                     {providerInfo.whatsappProvider === 'OFFICIAL' ? 'WhatsApp Conectado' : 'WhatsApp Conectado'}
                   </h2>
                   
                   {providerInfo.whatsappProvider === 'EVOLUTION' ? (
                     <div className="flex flex-col gap-1 items-center text-xs text-black/60 dark:text-white/60 mb-8 font-inter">
                       <div className="flex gap-2 bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-black/5 dark:border-white/5">
                         <span className="uppercase tracking-widest font-bold opacity-50">Instância</span>
                         <strong className="text-black dark:text-white">{configObj.instanceName || 'N/A'}</strong>
                       </div>
                       {configObj.phoneNumber && (
                         <div className="flex gap-2 bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-black/5 dark:border-white/5 mt-1">
                           <span className="uppercase tracking-widest font-bold opacity-50">Número</span>
                           <strong className="text-black dark:text-white">{configObj.phoneNumber}</strong>
                         </div>
                       )}
                     </div>
                   ) : (
                     <div className="flex gap-2 items-center text-xs text-black/60 dark:text-white/60 mb-8 font-inter bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-black/5 dark:border-white/5">
                       <span className="uppercase tracking-widest font-bold opacity-50">Telefone ID</span>
                       <strong className="text-black dark:text-white">{configObj.phoneNumberId || 'N/A'}</strong>
                     </div>
                   )}
                 </>
              )}

              <button 
                onClick={() => nextScreen(2)}
                disabled={!providerInfo?.whatsappConfig}
                className="w-full bg-black dark:bg-white text-white dark:text-black font-inter tracking-widest text-xs font-bold uppercase py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-xl"
              >
                Avançar para Envios <ArrowRight size={16} />
              </button>
            </div>
            <div className="mt-6 max-w-lg mx-auto text-center text-xs font-inter text-black/50 dark:text-white/50 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl p-5 leading-relaxed backdrop-blur-sm">
                <span className="font-bold text-black/70 dark:text-white/70 block mb-2 uppercase tracking-widest">Como conectar o dispositivo:</span> 
                Abra o WhatsApp {'>'} clique nos três pontinhos no lado direito superior {'>'} Dispositivos Conectados {'>'} Conectar Dispositivo {'>'} escaneie o código QR. Vá até a aba "Conexões" se precisar trocar a instância.
            </div>
          </div>
        )}

        {/* SCREEN 2: TARGETS */}
        {currentScreen === 2 && (
          <div className="flex-1 flex flex-col lg:flex-row gap-6 w-full h-full overflow-hidden animate-fade-in font-inter">
            
            {/* LEFT COLUMN: Source Contacts */}
            <div className="flex-1 flex flex-col bg-white/40 dark:bg-black/30 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-inner rounded-[2rem] overflow-hidden relative group">
              <div className="relative z-10 flex flex-col h-full w-full">
                <div className="p-5 pb-3 flex flex-col gap-4 border-b border-black/5 dark:border-white/5">
                  <div className="flex justify-between items-center px-1">
                    <h2 className="font-podium text-sm lg:text-base tracking-widest text-black dark:text-white uppercase">Contatos da Instância</h2>
                    <button 
                      onClick={fetchDatabaseContacts}
                      className="bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors text-black dark:text-white"
                    >
                      <Users size={14} /> Sincronizar API
                    </button>
                  </div>
                  <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
                    <input 
                      type="text" 
                      value={searchAll}
                      onChange={(e) => setSearchAll(e.target.value)}
                      placeholder="Pesquisar contatos..."
                      className="w-full bg-white/50 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-all font-inter"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 hide-scrollbar flex flex-col gap-2">
                  {allContacts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-black/40 dark:text-white/40 text-center p-6">
                      <Users size={32} className="mb-4 opacity-50" />
                      <p className="text-sm font-inter">Nenhum cliente carregado.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center px-4 py-3 text-xs font-bold text-black/50 dark:text-white/50 sticky top-0 bg-white/90 dark:bg-[#121215]/90 backdrop-blur-md border border-black/5 dark:border-white/5 rounded-xl mb-3 z-10 shadow-sm">
                        <input 
                          type="checkbox" 
                          checked={allContacts.length > 0 && selectedAllContacts.size === filteredAllContacts.length}
                          onChange={toggleAllAllSelection}
                          className="mr-3 w-4 h-4 accent-black dark:accent-white cursor-pointer rounded-sm"
                        />
                        <div className="flex-1 uppercase tracking-widest text-[10px]">Todos ({filteredAllContacts.length})</div>
                      </div>
                      
                      {filteredAllContacts.map(contact => (
                        <div key={contact.id} onClick={() => toggleAllSelection(contact.id)} className={`rounded-xl p-4 flex items-center transition-colors cursor-pointer border ${selectedAllContacts.has(contact.id) ? 'bg-black/5 dark:bg-white/10 border-black/20 dark:border-white/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5'}`}>
                          <input 
                            type="checkbox" 
                            checked={selectedAllContacts.has(contact.id)}
                            readOnly
                            className="mr-3 w-4 h-4 accent-black dark:accent-white cursor-pointer rounded-sm"
                          />
                          <div className="flex-1 flex flex-col min-w-0">
                            <span className="text-sm font-bold text-black dark:text-white truncate font-inter">{contact.name || 'Desconhecido'}</span>
                            <span className="text-[10px] text-black/50 dark:text-white/50 mt-1 tracking-widest">{contact.number}</span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                
                <div className="p-5 border-t border-black/10 dark:border-white/10 mt-auto bg-white/50 dark:bg-black/50 backdrop-blur-md">
                  <button 
                    onClick={moveSelectedToTarget}
                    disabled={selectedAllContacts.size === 0}
                    className="w-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-xl py-4 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-[10px] font-bold uppercase tracking-widest"
                  >
                    Mover Selecionados para Alvo <ArrowRight size={16} className="opacity-50" />
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Target Contacts */}
            <div className="flex-1 flex flex-col bg-white/40 dark:bg-black/30 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-inner rounded-[2rem] overflow-hidden relative group">
              <div className="relative z-10 flex flex-col h-full w-full">
                <div className="p-5 pb-3 flex flex-col gap-4 border-b border-black/5 dark:border-white/5">
                  <div className="flex justify-between items-center px-1">
                    <h2 className="font-podium text-sm lg:text-base tracking-widest text-black dark:text-white uppercase">Lista Alvo</h2>
                    <div className="flex gap-2 items-center">
                      <button 
                        onClick={() => setShowNewContactForm(!showNewContactForm)}
                        className="bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors text-black dark:text-white"
                      >
                        <UserPlus size={14} /> Novo
                      </button>
                      <span className="bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded-lg text-[10px] font-bold tracking-widest flex items-center">
                        {targetContacts.length} contatos
                      </span>
                    </div>
                  </div>

                  {/* List Management UI */}
                  <div className="flex gap-2 w-full animate-fade-in bg-white/50 dark:bg-black/40 p-3 rounded-xl border border-black/5 dark:border-white/5 shadow-sm items-center">
                    <div className="relative flex-1">
                      <FolderOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50" />
                      <select 
                        value={selectedListId}
                        onChange={(e) => loadList(e.target.value)}
                        className="w-full bg-transparent border-none focus:outline-none focus:ring-0 pl-9 pr-3 py-2 text-xs font-inter text-black dark:text-white appearance-none cursor-pointer"
                      >
                        <option value="" disabled className="text-black dark:text-white bg-white dark:bg-black">Carregar lista salva...</option>
                        {savedLists.map(list => (
                          <option key={list.id} value={list.id} className="text-black dark:text-white bg-white dark:bg-black">
                            {list.name} ({list.contacts.length} contatos)
                          </option>
                        ))}
                      </select>
                      {savedLists.length > 0 && selectedListId === '' && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] text-black/40 dark:text-white/40 font-bold uppercase">
                          ▼
                        </div>
                      )}
                    </div>
                    <div className="h-6 w-px bg-black/10 dark:bg-white/10 mx-1"></div>
                    <div className="flex flex-1 gap-2 items-center relative">
                      <input 
                        type="text" 
                        value={saveListName}
                        onChange={(e) => setSaveListName(e.target.value)}
                        placeholder="Nome para salvar..."
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:border-black/30 dark:focus:border-white/30 font-inter"
                      />
                      <button 
                        onClick={saveCurrentList}
                        title="Salvar Lista Atual"
                        disabled={targetContacts.length === 0}
                        className="bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 p-2 rounded-lg text-black dark:text-white transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
                      >
                        <Save size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {savedLists.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                      {savedLists.map(list => (
                        <div key={list.id} className="flex shrink-0 items-center gap-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 px-2 py-1 rounded-lg text-[10px] font-inter text-black/70 dark:text-white/70 group">
                          <span className="truncate max-w-[100px] cursor-pointer hover:text-black dark:hover:text-white" onClick={() => loadList(list.id)}>{list.name}</span>
                          <button onClick={(e) => deleteSavedList(list.id, e)} className="text-red-500 opacity-0 group-hover:opacity-100 hover:text-red-700 transition-opacity ml-1 p-0.5"><Trash2 size={10} /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {showNewContactForm && (
                    <div className="bg-white/60 dark:bg-black/40 border border-black/10 dark:border-white/10 p-4 rounded-xl flex flex-col gap-3 animate-fade-in shadow-sm">
                      <div className="flex gap-3">
                        <input 
                          type="text" 
                          value={newContactName}
                          onChange={(e) => setNewContactName(e.target.value)}
                          placeholder="Nome (opcional)"
                          className="flex-1 w-1/2 bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:border-black/30 dark:focus:border-white/30 font-inter"
                        />
                        <input 
                          type="text" 
                          value={newContactPhone}
                          onChange={(e) => setNewContactPhone(e.target.value)}
                          placeholder="5511999999999"
                          className="flex-1 w-1/2 bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:border-black/30 dark:focus:border-white/30 font-inter"
                        />
                      </div>
                      <div className="flex justify-end gap-3 mt-1">
                        <button onClick={() => setShowNewContactForm(false)} className="text-[10px] tracking-widest uppercase font-bold text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white px-2">Cancelar</button>
                        <button onClick={handleAddNewContact} className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-[10px] uppercase font-bold tracking-widest hover:scale-105 transition-transform">Salvar</button>
                      </div>
                    </div>
                  )}
                  
                  <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
                    <input 
                      type="text" 
                      value={searchTarget}
                      onChange={(e) => setSearchTarget(e.target.value)}
                      placeholder="Filtrar na lista alvo..."
                      className="w-full bg-white/50 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-all font-inter"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 hide-scrollbar flex flex-col gap-2">
                  {targetContacts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-black/40 dark:text-white/40 text-center p-6">
                      <Users size={32} className="mb-4 opacity-50" />
                      <p className="text-sm font-inter">A lista alvo está vazia.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center px-4 py-3 text-xs font-bold text-black/50 dark:text-white/50 sticky top-0 bg-white/90 dark:bg-[#121215]/90 backdrop-blur-md border border-black/5 dark:border-white/5 rounded-xl mb-3 z-10 shadow-sm">
                        <input 
                          type="checkbox" 
                          checked={targetContacts.length > 0 && selectedTargetContacts.size === filteredTargetContacts.length}
                          onChange={toggleAllTargetSelection}
                          className="mr-3 w-4 h-4 accent-black dark:accent-white cursor-pointer rounded-sm"
                        />
                        <div className="flex-1 uppercase tracking-widest text-[10px]">Todos ({filteredTargetContacts.length})</div>
                        {selectedTargetContacts.size > 0 && (
                          <button onClick={removeSelectedFromTarget} className="text-red-500 font-bold hover:text-red-600 ml-2 flex items-center gap-1 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 text-[10px] tracking-widest uppercase transition-colors"><Trash2 size={12}/> Remover</button>
                        )}
                      </div>
                      
                      {filteredTargetContacts.map(contact => (
                        <div key={contact.id} onClick={() => toggleTargetSelection(contact.id)} className={`rounded-xl p-4 flex items-center transition-colors cursor-pointer border ${selectedTargetContacts.has(contact.id) ? 'bg-black/5 dark:bg-white/10 border-black/20 dark:border-white/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5'}`}>
                          <input 
                            type="checkbox" 
                            checked={selectedTargetContacts.has(contact.id)}
                            readOnly
                            className="mr-3 w-4 h-4 accent-black dark:accent-white cursor-pointer rounded-sm"
                          />
                          <div className="flex-1 flex flex-col min-w-0">
                            <span className="text-sm font-bold text-black dark:text-white truncate font-inter">{contact.name || 'Desconhecido'}</span>
                            <span className="text-[10px] text-black/50 dark:text-white/50 mt-1 tracking-widest">{contact.number}</span>
                          </div>
                          {contact.status === 'sent' && <CheckCircle2 size={16} className="text-emerald-500 ml-2" />}
                          {contact.status === 'error' && <AlertCircle size={16} className="text-red-500 ml-2" />}
                        </div>
                      ))}
                    </>
                  )}
                </div>
                
                <div className="p-5 border-t border-black/10 dark:border-white/10 mt-auto bg-white/50 dark:bg-black/50 backdrop-blur-md flex gap-2">
                  <button 
                    onClick={() => nextScreen(3)}
                    disabled={targetContacts.length === 0}
                    className="flex-1 bg-black dark:bg-white hover:scale-105 text-white dark:text-black rounded-xl py-4 flex items-center justify-center gap-2 transition-transform disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed text-[10px] uppercase font-bold tracking-widest shadow-xl"
                  >
                    Avançar para Mensagem <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* SCREEN 3: BROADCAST */}
        {currentScreen === 3 && (
          <div className="flex-1 flex flex-col lg:flex-row gap-6 w-full h-full overflow-hidden animate-fade-in font-inter">
            {/* Left Config Panel */}
            <div className="flex-1 flex flex-col bg-white/40 dark:bg-black/30 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-inner rounded-[2rem] overflow-hidden relative">
               <div className="p-6 pb-2 border-b border-black/5 dark:border-white/5 bg-white/30 dark:bg-black/20">
                 <button onClick={() => setCurrentScreen(2)} className="text-[10px] text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white mb-4 flex items-center gap-1 font-bold uppercase tracking-widest transition-colors"><ArrowLeft size={14}/> Voltar</button>
                 <h2 className="font-podium text-xl uppercase tracking-widest text-black dark:text-white mb-2">
                   Configure a Mensagem
                 </h2>
               </div>
               <div className="flex-1 overflow-y-auto p-6 hide-scrollbar flex flex-col gap-6">
                 
                 <div className="bg-white/50 dark:bg-black/40 p-5 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                   <div className="flex justify-between items-center mb-3">
                     <label className="text-[10px] font-bold text-black/50 dark:text-white/50 uppercase tracking-widest">Texto da Mensagem</label>
                   </div>
                   <div className="relative">
                     <textarea
                       value={message}
                       onChange={e => setMessage(e.target.value)}
                       placeholder="Olá {nome}! Se precisar de mais informações, estou à disposição!"
                       className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-5 text-black dark:text-white text-sm focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors resize-none rounded-xl h-48 shadow-inner font-inter leading-relaxed"
                     />
                     <button 
                        onClick={() => setMessage(prev => prev + '{nome}')}
                        className="absolute bottom-4 right-4 text-[10px] bg-black dark:bg-white text-white dark:text-black font-bold tracking-widest px-3 py-1.5 rounded-lg hover:scale-105 transition-transform uppercase shadow-md"
                      >
                        + Nome
                      </button>
                   </div>
                 </div>

                 <div className="bg-white/50 dark:bg-black/40 p-5 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                   <div className="flex justify-between items-center mb-3">
                     <label className="text-[10px] font-bold text-black/50 dark:text-white/50 uppercase tracking-widest">Mídias: (Opcional)</label>
                   </div>
                   <div className="flex flex-col md:flex-row gap-3">
                     <select 
                       value={mediaType} 
                       onChange={e => setMediaType(e.target.value as any)}
                       className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 text-black dark:text-white text-sm focus:outline-none focus:border-black/30 dark:focus:border-white/30 rounded-xl cursor-pointer"
                     >
                       <option value="image">Imagem (URL)</option>
                       <option value="video">Vídeo (URL)</option>
                     </select>
                     <input
                       type="text"
                       value={mediaUrl}
                       onChange={e => setMediaUrl(e.target.value)}
                       placeholder="URL da mídia (https://...)"
                       className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 text-black dark:text-white text-sm focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors rounded-xl shadow-inner"
                     />
                   </div>
                 </div>
               </div>
            </div>

            {/* Right Panel: Preview & Logs */}
            <div className="flex-1 flex flex-col gap-6 h-full w-full lg:w-1/2">
              
              {/* Preview */}
              <div className="bg-white/40 dark:bg-black/30 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-inner rounded-[2rem] p-6 flex flex-col items-center justify-center min-h-[250px] relative">
                <div className="absolute top-5 w-full text-center text-[10px] text-black/50 dark:text-white/50 uppercase tracking-widest font-bold">Preview da Mensagem</div>
                <div className="w-full max-w-sm mt-8">
                  <div className="bg-[#e5ddd5] dark:bg-[#0b141a] rounded-2xl p-5 w-full border border-black/5 dark:border-white/5 shadow-2xl relative">
                    <div className="absolute inset-0 bg-white dark:bg-white opacity-[0.05] rounded-2xl"></div>
                    <div className="relative z-10 flex flex-col gap-1 items-end">
                      <div className="bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-white p-3 px-4 rounded-2xl rounded-tr-sm text-sm shadow-sm inline-block max-w-[90%] break-words font-inter leading-relaxed relative">
                        {message ? message.replace(/{nome}/gi, 'João da Silva') : <span className="opacity-50 italic">Olá João da Silva! Se precisar de mais informações, estou à disposição!</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              {!isSending && (
                <button
                  onClick={startBroadcast}
                  className="w-full bg-black dark:bg-white text-white dark:text-black font-bold text-sm py-5 rounded-[2rem] flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform shadow-xl uppercase tracking-widest"
                >
                  Iniciar Disparo <Play size={18} fill="currentColor" />
                </button>
              )}

              {/* Logs */}
              {isSending && (
                <div className="flex-1 bg-white/60 dark:bg-black/60 backdrop-blur-xl p-5 rounded-[2rem] border border-black/10 dark:border-white/10 font-mono text-xs overflow-y-auto flex flex-col gap-2 shadow-inner relative min-h-[200px]">
                  <div className="absolute top-4 right-5 text-[10px] text-black/40 dark:text-white/40 uppercase tracking-widest font-bold">Logs / Terminal</div>
                  <div className="mt-6 flex-1 overflow-y-auto hide-scrollbar pr-2">
                    {logs.length === 0 && <div className="text-black/30 dark:text-white/30 italic mt-2">Iniciando...</div>}
                    {logs.map(log => (
                      <div key={log.id} className={`mb-1.5 flex gap-2
                        ${log.status === 'success' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}
                        ${log.status === 'error' ? 'text-red-600 dark:text-red-400 font-bold' : ''}
                        ${log.status === 'pending' ? 'text-blue-600 dark:text-blue-300' : 'text-black/70 dark:text-white/70'}
                      `}>
                        <span className="opacity-50 shrink-0">[{log.timestamp.toLocaleTimeString()}]</span> 
                        <span>{log.text}</span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                  
                  <div className="pt-3 border-t border-black/10 dark:border-white/10 mt-auto flex gap-2 shrink-0">
                    <button
                      onClick={() => {
                        isPausedRef.current = !isPausedRef.current;
                        setIsPausedUI(isPausedRef.current);
                        addLog(isPausedRef.current ? 'Disparo pausado.' : 'Disparo retomado.', 'pending');
                      }}
                      className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-700 dark:text-yellow-400 font-bold text-[10px] uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-yellow-500/20"
                    >
                      {isPausedUI ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                      {isPausedUI ? 'Retomar' : 'Pausar'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Tem certeza que deseja cancelar o disparo?')) {
                          isCancelledRef.current = true;
                          addLog('Cancelando...', 'error');
                        }
                      }}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-400 font-bold text-[10px] uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-red-500/20"
                    >
                      <Square size={14} fill="currentColor" />
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
