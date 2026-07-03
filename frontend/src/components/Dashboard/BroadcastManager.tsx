import { useState, useRef, useEffect, useMemo, useDeferredValue, useCallback } from 'react';
import axios from 'axios';
import { Play, Pause, Square, Users, MessageSquare, Plug, ArrowRight, UserPlus, Search, CheckCircle2, AlertCircle, Trash2, ArrowLeft, Save, FolderOpen, Pencil } from 'lucide-react';

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
interface MediaAttachment {
  id: string;
  base64: string;
  name: string;
  type: string;
}

interface Contact {
  id: string;
  name?: string;
  pushName?: string;
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

export default function BroadcastManager({ setActiveTab }: { setActiveTab?: (tab: 'SETTINGS' | 'KANBAN' | 'PRODUCTS' | 'BROADCAST' | 'ADMIN') => void }) {
  const [currentScreen, setCurrentScreen] = useState<1 | 2 | 3>(1);
  const [providerInfo, setProviderInfo] = useState<any>(null);
  const [actualInstanceStatus, setActualInstanceStatus] = useState<string>('Verificando...');
  
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
  const [mediaAttachments, setMediaAttachments] = useState<MediaAttachment[]>([]);
  const [textPosition, setTextPosition] = useState<'before' | 'after' | 'caption'>('after');
  
  useEffect(() => {
    if (mediaAttachments.length > 1 && textPosition === 'caption') {
      setTextPosition('after');
    }
  }, [mediaAttachments.length, textPosition]);
  
  // Broadcast State
  const [isSending, setIsSending] = useState(false);
  const [isPausedUI, setIsPausedUI] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [usageStats, setUsageStats] = useState<{used: number, limit: number} | null>(null);
  const [sessionSentCount, setSessionSentCount] = useState(0);
  
  const [minDelay] = useState(15);
  const [maxDelay] = useState(90);
  
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingContactName, setEditingContactName] = useState("");

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    message: string;
    resolve?: (value: boolean) => void;
  } | null>(null);

  const showAlert = (message: string) => {
    return new Promise<void>((resolve) => {
      setModalConfig({ isOpen: true, type: 'alert', message, resolve: () => resolve() });
    });
  };

  const showConfirm = (message: string) => {
    return new Promise<boolean>((resolve) => {
      setModalConfig({ isOpen: true, type: 'confirm', message, resolve });
    });
  };

  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const apiUrl = import.meta.env.VITE_API_URL || '';

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

  useEffect(() => {
    if (configObj?.instanceName) {
      const checkStatus = async () => {
        try {
          const res = await axios.get(`${apiUrl}/api/auth/evolution/instance/${configObj.instanceName}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.data?.instance?.state === 'open') {
            setActualInstanceStatus('Conectado');
          } else {
            setActualInstanceStatus('Desconectado');
          }
        } catch (e) {
          setActualInstanceStatus('Desconectado');
        }
      };
      checkStatus();
    }
  }, [configObj, apiUrl]);

  // Load Saved Lists
  const fetchLists = useCallback(async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/broadcast/lists`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const parsedLists = res.data.map((l: any) => ({
        ...l,
        contacts: JSON.parse(l.contacts)
      }));
      setSavedLists(parsedLists);
    } catch (e) {
      console.error(e);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/broadcast/usage`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUsageStats(res.data);
    } catch (e) {
      console.error(e);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const saveCurrentList = async () => {
    if (!saveListName.trim()) { showAlert('Digite um nome para salvar a lista.'); return; }
    if (targetContacts.length === 0) { showAlert('A lista alvo está vazia.'); return; }
    try {
      await axios.post(`${apiUrl}/api/broadcast/lists`, {
        name: saveListName,
        contacts: targetContacts
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSaveListName('');
      showAlert('Lista salva com sucesso!');
      fetchLists();
    } catch (error) {
      showAlert('Erro ao salvar lista.');
    }
  };

  const loadList = async (id: string) => {
    setSelectedListId(id);
    if (!id) return;

    if (id === 'NEW') {
       if (targetContacts.length > 0) {
           const confirmed = await showConfirm('Isso vai esvaziar a Lista Alvo atual para você criar uma nova lista. Continuar?');
           if (!confirmed) {
             setTimeout(() => setSelectedListId(''), 100);
             return;
           }
       }
       setTargetContacts([]);
       setSelectedTargetContacts(new Set());
       setSaveListName('');
       setTimeout(() => setSelectedListId(''), 100);
       return;
    }

    const list = savedLists.find(l => l.id === id);
    if (list) {
      if (targetContacts.length > 0) {
          const confirmed = await showConfirm(`Deseja substituir a Lista Alvo atual pela lista "${list.name}"? (Os contatos atuais serão removidos do alvo)`);
          if (!confirmed) {
             setTimeout(() => setSelectedListId(''), 100);
             return;
          }
      }
      setTargetContacts(list.contacts);
      setSelectedTargetContacts(new Set());
      setSaveListName(list.name);
    }
    // reset select
    setTimeout(() => setSelectedListId(''), 100);
  };
  
  const deleteSavedList = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showConfirm('Tem certeza que deseja apagar esta lista salva?');
    if (!confirmed) return;
    try {
      await axios.delete(`${apiUrl}/api/broadcast/lists/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchLists();
    } catch (e) {
      showAlert('Erro ao deletar lista.');
    }
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
      showAlert("Erro ao buscar clientes do banco de dados.");
    }
  };

  const fetchWhatsAppContacts = async () => {
    try {
      addLog('Buscando contatos do WhatsApp...', 'pending');
      const res = await axios.get(`${apiUrl}/api/broadcast/whatsapp-contacts`, {
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
      addLog(`Encontrados ${uniqueMap.size} contatos no WhatsApp.`, 'success');
    } catch (e: any) {
      showAlert(e?.response?.data?.error || "Erro ao buscar contatos do WhatsApp.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    let filesArray = Array.from(files);
    
    const availableSlots = Math.max(0, 3 - mediaAttachments.length);
    if (filesArray.length > availableSlots) {
      showAlert(`Você só pode anexar no máximo 3 mídias.`);
      filesArray = filesArray.slice(0, availableSlots);
    }
    
    filesArray.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1280; const MAX_HEIGHT = 1280;
            let width = img.width; let height = img.height;
            if (width > height) {
              if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
              if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setMediaAttachments(current => {
              if (current.length >= 3) return current;
              return [...current, { id: Date.now().toString() + Math.random().toString(), base64: dataUrl, name: file.name.replace(/\.[^/.]+$/, "") + "_otimizada.jpg", type: 'image/jpeg' }];
            });
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          showAlert(`O arquivo "${file.name}" é muito grande. O limite para vídeos é 5MB.`);
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaAttachments(current => {
            if (current.length >= 3) return current;
            return [...current, { id: Date.now().toString() + Math.random().toString(), base64: reader.result as string, name: file.name, type: file.type }];
          });
        };
        reader.readAsDataURL(file);
      }
    });
    e.target.value = '';
  };

  const handleAddNewContact = () => {
    if (!newContactPhone.trim()) {
      showAlert("O telefone é obrigatório.");
      return;
    }
    const cleanPhone = newContactPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      showAlert("Número de telefone inválido.");
      return;
    }
    
    const newContact: Contact = {
      id: cleanPhone,
      name: newContactName.trim() || undefined,
      number: cleanPhone,
      status: 'pending'
    };
    
    if (targetContacts.some(c => c.id === newContact.id)) {
       showAlert("Este número já está na lista alvo.");
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
      c.pushName?.toLowerCase().includes(searchLower) ||
      c.number.includes(deferredSearchAll)
    );
  }, [allContacts, deferredSearchAll]);

  const filteredTargetContacts = useMemo(() => {
    const searchLower = deferredSearchTarget.toLowerCase();
    return targetContacts.filter(c => 
      c.name?.toLowerCase().includes(searchLower) || 
      c.pushName?.toLowerCase().includes(searchLower) ||
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

  const startEditingContact = (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation();
    setEditingContactId(contact.id);
    setEditingContactName(contact.name || contact.pushName || '');
  };

  const saveContactName = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    if (!editingContactId) return;
    
    setTargetContacts(prev => prev.map(c => 
      c.id === editingContactId ? { ...c, name: editingContactName } : c
    ));
    setEditingContactId(null);
  };

  const startBroadcast = async () => {
    if (targetContacts.length === 0) {
      showAlert('A lista alvo está vazia.');
      return;
    }
    if (!message.trim() && mediaAttachments.length === 0) {
      showAlert('Digite uma mensagem ou adicione uma mídia para enviar.');
      return;
    }

    setIsSending(true);
    setIsPausedUI(false);
    isPausedRef.current = false;
    isCancelledRef.current = false;
    setSessionSentCount(0);
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
        const personalizedMessage = message.replace(/{nome}/gi, contact.name || contact.pushName || 'cliente');
        
        // Anti-ban: Simular digitação
        const textLength = personalizedMessage ? personalizedMessage.length : 10;
        const typingDelayMs = Math.min(Math.max(textLength * 40, 2000), 15000) + Math.floor(Math.random() * 2000);
        addLog(`Simulando digitação para ${contact.name || contact.pushName || contact.number} (${(typingDelayMs/1000).toFixed(1)}s)...`, 'pending');
        
        try {
          await axios.post(`${apiUrl}/api/broadcast/presence`, { number: contact.number, presence: 'composing', delay: typingDelayMs }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
        } catch(e) {}
        
        let typingWaited = 0;
        while(typingWaited < typingDelayMs) {
           if (isCancelledRef.current) break;
           await unthrottledSleep(100);
           typingWaited += 100;
        }
        if (isCancelledRef.current) break;

        const sendText = async (txt: string) => {
           await axios.post(`${apiUrl}/api/broadcast/send`, { number: contact.number, text: txt }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
        };

        const sleepCheck = async (ms: number) => {
           let w = 0;
           while(w < ms) {
              if (isCancelledRef.current) return false;
              await unthrottledSleep(100);
              w += 100;
           }
           return true;
        }

        if (mediaAttachments.length > 0) {
           if (textPosition === 'before' && personalizedMessage) {
               await sendText(personalizedMessage);
               if (!(await sleepCheck(2000))) break;
           }
           for (let mIndex = 0; mIndex < mediaAttachments.length; mIndex++) {
              const attachment = mediaAttachments[mIndex];
              await axios.post(`${apiUrl}/api/broadcast/send`, {
                number: contact.number,
                mediaBase64: attachment.base64,
                mediaType: attachment.type.startsWith('video') ? 'video' : 'image',
                fileName: attachment.name,
                text: (textPosition === 'caption' && mIndex === 0) ? personalizedMessage : ''
              }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
              if (mIndex < mediaAttachments.length - 1) {
                  if (!(await sleepCheck(1500))) break;
              }
           }
           if (textPosition === 'after' && personalizedMessage) {
               if (!(await sleepCheck(2000))) break;
               await sendText(personalizedMessage);
           }
        } else {
           await sendText(personalizedMessage);
        }

        currentContacts[i] = { ...contact, status: 'sent' };
        sentCount++;
        setSessionSentCount(sentCount);
        fetchUsage(); // update UI limit silently
        addLog(`Enviado para ${contact.name || contact.pushName || contact.number}`, 'success');
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
          await unthrottledSleep(100);
          waited += 100;
        }
        if (isCancelledRef.current) {
           addLog('Disparo cancelado pelo usuário.', 'error');
           break;
        }
      }
    }

    addLog(`Disparo concluído! ${sentCount} mensagens enviadas.`, 'success');
    setIsSending(false);
    showAlert(`Disparo concluído! ${sentCount} mensagens enviadas com sucesso.`);
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
        
        {actualInstanceStatus !== 'Conectado' && (
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xl mx-auto animate-fade-in">
             <div className="w-full bg-white/60 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10 p-8 rounded-[2rem] shadow-xl flex flex-col items-center text-center">
                 <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-6">
                    <AlertCircle size={32} />
                 </div>
                 <h2 className="font-podium text-2xl tracking-widest uppercase mb-4 text-black dark:text-white">
                    Nenhuma Conexão
                 </h2>
                 <p className="text-red-500 bg-red-500/10 px-4 py-3 rounded-xl text-xs font-inter font-bold uppercase tracking-wider mb-8">
                    API não configurada! Vá na aba Conexões para configurar o seu WhatsApp.
                 </p>
                 <button 
                   onClick={() => setActiveTab && setActiveTab('SETTINGS')}
                   className="bg-black dark:bg-white text-white dark:text-black font-inter tracking-widest text-xs font-bold uppercase px-8 py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-xl"
                 >
                   Ir para Conexões <ArrowRight size={16} />
                 </button>
             </div>
           </div>
        )}

        {/* SCREEN 1: CONNECTION */}
        {actualInstanceStatus === 'Conectado' && currentScreen === 1 && (
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
                 </>
              ) : (
                 <>
                   <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 text-blue-500 border border-blue-500/20 shadow-lg">
                     <Plug size={40} />
                   </div>
                   
                   <h2 className="font-podium text-xl uppercase tracking-widest text-black dark:text-white mb-2">
                     WhatsApp Conectado
                   </h2>
                   
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
                 </>
              )}

              <button 
                onClick={() => nextScreen(2)}
                disabled={!providerInfo?.whatsappConfig || actualInstanceStatus !== 'Conectado'}
                className="w-full bg-black dark:bg-white text-white dark:text-black font-inter tracking-widest text-xs font-bold uppercase py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-xl mt-6"
              >
                Avançar para Envios <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 2: TARGETS */}
        {actualInstanceStatus === 'Conectado' && currentScreen === 2 && (
          <div className="flex-1 flex flex-col lg:flex-row gap-6 w-full h-full overflow-hidden animate-fade-in font-inter">
            
            {/* LEFT COLUMN: Source Contacts */}
            <div className="flex-1 flex flex-col bg-white/40 dark:bg-black/30 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-inner rounded-[2rem] overflow-hidden relative group">
              <div className="relative z-10 flex flex-col h-full w-full">
                <div className="p-5 pb-3 flex flex-col gap-4 border-b border-black/5 dark:border-white/5">
                  <div className="flex justify-between items-center px-1">
                    <h2 className="font-podium text-sm lg:text-base tracking-widest text-black dark:text-white uppercase">Contatos</h2>
                    <div className="flex gap-2">
                        <button 
                          onClick={fetchWhatsAppContacts}
                          title="Sincronizar com seu WhatsApp"
                          className="bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors text-black dark:text-white"
                        >
                          <Users size={14} /> WhatsApp
                        </button>
                        <button 
                          onClick={fetchDatabaseContacts}
                          title="Sincronizar Clientes do Cardápio"
                          className="bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors text-black dark:text-white"
                        >
                          <Users size={14} /> Clientes
                        </button>
                    </div>
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
                            <span className="text-sm font-bold text-black dark:text-white truncate font-inter">{contact.name || contact.pushName || 'Desconhecido'}</span>
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
                        <option value="NEW" className="text-black dark:text-white bg-white dark:bg-black font-bold">+ Nova Lista Vazia</option>
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
                            {editingContactId === contact.id ? (
                              <input
                                autoFocus
                                value={editingContactName}
                                onChange={e => setEditingContactName(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onBlur={() => saveContactName()}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveContactName(e);
                                  if (e.key === 'Escape') setEditingContactId(null);
                                }}
                                className="text-sm font-bold text-black dark:text-white bg-transparent border-b border-black/20 dark:border-white/20 focus:outline-none focus:border-black/50 dark:focus:border-white/50 w-full mb-1"
                              />
                            ) : (
                              <div className="flex items-center gap-2 group/edit">
                                <span className="text-sm font-bold text-black dark:text-white truncate font-inter">
                                  {contact.name || contact.pushName || 'Desconhecido'}
                                </span>
                                <button 
                                  onClick={(e) => startEditingContact(e, contact)}
                                  className="text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white opacity-0 group-hover/edit:opacity-100 transition-opacity"
                                >
                                  <Pencil size={12} />
                                </button>
                              </div>
                            )}
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
        {actualInstanceStatus === 'Conectado' && currentScreen === 3 && (
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
                     <label className="text-[10px] font-bold text-black/50 dark:text-white/50 uppercase tracking-widest">Mídias: (Opcional - Máx 3)</label>
                   </div>
                   <div className="flex flex-col gap-3">
                     <div className="flex flex-col gap-3 mb-2">
                       <label className="flex items-center gap-3 cursor-pointer group">
                         <input type="radio" value="after" checked={textPosition === 'after'} onChange={() => setTextPosition('after')} className="accent-black dark:accent-white w-4 h-4" />
                         <span className="text-xs text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white transition-colors font-inter">Texto separado, APÓS a mídia</span>
                       </label>
                       <label className="flex items-center gap-3 cursor-pointer group">
                         <input type="radio" value="before" checked={textPosition === 'before'} onChange={() => setTextPosition('before')} className="accent-black dark:accent-white w-4 h-4" />
                         <span className="text-xs text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white transition-colors font-inter">Texto separado, ANTES da mídia</span>
                       </label>
                       <label className={`flex items-center gap-3 cursor-pointer group ${mediaAttachments.length > 1 ? 'opacity-50 pointer-events-none' : ''}`}>
                         <input type="radio" value="caption" checked={textPosition === 'caption'} onChange={() => setTextPosition('caption')} disabled={mediaAttachments.length > 1} className="accent-black dark:accent-white w-4 h-4" />
                         <span className="text-xs text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white transition-colors font-inter">Texto embutido como legenda na imagem {mediaAttachments.length > 1 && <span className="text-[10px] text-red-500 font-bold ml-2 uppercase">(Apenas para 1 mídia)</span>}</span>
                       </label>
                     </div>
                     <input
                       type="file"
                       multiple
                       accept="image/*"
                       onChange={handleFileUpload}
                       className="text-xs text-black/50 dark:text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-widest file:bg-black dark:file:bg-white file:text-white dark:file:text-black hover:file:bg-black/80 dark:hover:file:bg-white/80 transition-colors cursor-pointer"
                     />
                     {mediaAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {mediaAttachments.map(media => (
                             <div key={media.id} className="relative group rounded-lg overflow-hidden border border-black/10 dark:border-white/10 w-16 h-16">
                               {media.type.startsWith('image/') ? (
                                  <img src={media.base64} alt={media.name} className="w-full h-full object-cover" />
                               ) : (
                                  <video src={media.base64} className="w-full h-full object-cover" />
                               )}
                               <button 
                                 onClick={() => setMediaAttachments(prev => prev.filter(m => m.id !== media.id))}
                                 className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] uppercase font-bold tracking-widest"
                               >X</button>
                             </div>
                          ))}
                        </div>
                     )}
                   </div>
                 </div>
               </div>
            </div>

            {/* Right Panel: Preview & Logs */}
            <div className="flex-1 flex flex-col gap-6 h-full w-full lg:w-1/2 min-h-0">
              
              {/* Preview */}
              <div className="flex-1 bg-white/40 dark:bg-black/30 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-inner rounded-[2rem] p-6 flex flex-col items-center min-h-0 relative overflow-y-auto hide-scrollbar">
                <div className="w-full text-center text-[10px] text-black/50 dark:text-white/50 uppercase tracking-widest font-bold shrink-0 mb-6">Preview da Mensagem</div>
                <div className="w-full max-w-sm shrink-0">
                  <div className="bg-[#e5ddd5] dark:bg-[#0b141a] rounded-2xl p-5 w-full border border-black/5 dark:border-white/5 shadow-2xl relative">
                    <div className="absolute inset-0 bg-white dark:bg-white opacity-[0.05] rounded-2xl pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col gap-2 items-end w-full">
                      {mediaAttachments.length === 0 ? (
                        <div className="bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-white p-3 px-4 rounded-2xl rounded-tr-sm text-sm shadow-sm inline-block max-w-[90%] break-words font-inter leading-relaxed relative">
                          {message ? message.replace(/{nome}/gi, 'João da Silva') : <span className="opacity-50 italic">Olá João da Silva! Se precisar de mais informações, estou à disposição!</span>}
                        </div>
                      ) : (
                        <>
                          {textPosition === 'before' && (
                            <div className="bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-white p-3 px-4 rounded-2xl rounded-tr-sm text-sm shadow-sm inline-block max-w-[90%] break-words font-inter leading-relaxed relative">
                              {message ? message.replace(/{nome}/gi, 'João da Silva') : <span className="opacity-50 italic">Olá João da Silva! Se precisar de mais informações, estou à disposição!</span>}
                            </div>
                          )}

                          {mediaAttachments.map((media, index) => (
                            <div key={media.id} className="bg-[#d9fdd3] dark:bg-[#005c4b] p-1.5 rounded-2xl rounded-tr-sm shadow-sm max-w-[90%] flex flex-col">
                              <img src={media.base64} alt="Preview" className="w-full max-w-[220px] max-h-[300px] object-cover rounded-xl" />
                              {textPosition === 'caption' && index === 0 && (
                                <div className="text-[#111b21] dark:text-white pt-2 pb-1 px-2 text-sm font-inter break-words max-w-[220px]">
                                  {message ? message.replace(/{nome}/gi, 'João da Silva') : <span className="opacity-50 italic">Olá João da Silva! Se precisar de mais informações, estou à disposição!</span>}
                                </div>
                              )}
                            </div>
                          ))}

                          {textPosition === 'after' && (
                            <div className="bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-white p-3 px-4 rounded-2xl rounded-tr-sm text-sm shadow-sm inline-block max-w-[90%] break-words font-inter leading-relaxed relative">
                              {message ? message.replace(/{nome}/gi, 'João da Silva') : <span className="opacity-50 italic">Olá João da Silva! Se precisar de mais informações, estou à disposição!</span>}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Start Button & Counters */}
              {!isSending ? (
                <div className="flex flex-col gap-3">
                  {usageStats && (
                    <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/10 dark:border-white/10 font-mono text-sm">
                      <span className="text-black/60 dark:text-white/60 font-inter font-bold text-xs uppercase tracking-widest">Uso Diário</span>
                      <div className={`font-bold ${usageStats.used >= usageStats.limit ? 'text-red-500' : 'text-emerald-500'}`}>
                        {usageStats.used} <span className="text-black/40 dark:text-white/40">/ {usageStats.limit}</span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={startBroadcast}
                    disabled={usageStats ? usageStats.used >= usageStats.limit : false}
                    className="w-full bg-black dark:bg-white text-white dark:text-black font-bold text-sm py-5 rounded-[2rem] flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform shadow-xl uppercase tracking-widest disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                  >
                    Iniciar Disparo <Play size={18} fill="currentColor" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 font-mono text-sm shadow-inner">
                  <span className="text-emerald-600 dark:text-emerald-400 font-inter font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    Enviando Agora
                  </span>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                    {sessionSentCount} <span className="text-emerald-600/50 dark:text-emerald-400/50 text-sm">/ {targetContacts.length}</span>
                  </div>
                </div>
              )}

              {/* Logs */}
              {(isSending || logs.length > 0) && (
                <div className="flex-1 bg-white/60 dark:bg-black/60 backdrop-blur-xl p-5 rounded-[2rem] border border-black/10 dark:border-white/10 font-mono text-xs overflow-y-auto flex flex-col gap-2 shadow-inner relative min-h-[200px]">
                  <div className="absolute top-4 right-5 text-[10px] text-black/40 dark:text-white/40 uppercase tracking-widest font-bold">Histórico / Logs</div>
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
                  
                  {isSending && (
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
                        onClick={async () => {
                          const confirmed = await showConfirm('Tem certeza que deseja cancelar o disparo?');
                          if (confirmed) {
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
                  )}
                </div>
              )}
              
            </div>
          </div>
        )}
      </main>

      {/* CUSTOM MODAL */}
      {modalConfig?.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#121215] border border-black/10 dark:border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fade-up flex flex-col items-center text-center">
             {modalConfig.type === 'alert' ? <AlertCircle size={48} className="text-blue-500 mb-4" /> : <AlertCircle size={48} className="text-yellow-500 mb-4" />}
             <p className="text-black dark:text-white font-inter text-sm mb-6">{modalConfig.message}</p>
             <div className="flex gap-3 w-full">
               {modalConfig.type === 'confirm' && (
                 <button 
                   onClick={() => { setModalConfig(null); if (modalConfig.resolve) modalConfig.resolve(false); }}
                   className="flex-1 py-3 rounded-xl border border-black/10 dark:border-white/10 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 font-bold uppercase tracking-widest text-[10px] transition-colors"
                 >Cancelar</button>
               )}
               <button 
                 onClick={() => { setModalConfig(null); if (modalConfig.resolve) modalConfig.resolve(true); }}
                 className="flex-1 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-widest text-[10px] hover:scale-105 transition-transform"
               >OK</button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
