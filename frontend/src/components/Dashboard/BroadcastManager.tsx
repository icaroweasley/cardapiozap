import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Play, Pause, Square, Users, Settings, MessageSquare, Image as ImageIcon } from 'lucide-react';

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
  const [targetContacts, setTargetContacts] = useState<Contact[]>([]);
  const [rawContacts, setRawContacts] = useState('');
  
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  
  const [isSending, setIsSending] = useState(false);
  const [isPausedUI, setIsPausedUI] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const [minDelay, setMinDelay] = useState(10);
  const [maxDelay, setMaxDelay] = useState(25);

  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (text: string, status: 'pending' | 'success' | 'error') => {
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), text, status, timestamp: new Date() }]);
  };

  const parseContacts = () => {
    const lines = rawContacts.split('\n');
    const parsed: Contact[] = [];
    lines.forEach((line, index) => {
      const clean = line.trim().replace(/\D/g, '');
      if (clean && clean.length >= 10) {
        parsed.push({
          id: `contact_${index}`,
          number: clean,
          status: 'pending'
        });
      }
    });
    setTargetContacts(parsed);
    addLog(`${parsed.length} contatos carregados.`, 'success');
  };

  const startBroadcast = async () => {
    if (targetContacts.length === 0) {
      alert('A lista de disparo está vazia. Carregue os contatos primeiro.');
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
        const payload = {
          number: contact.number,
          text: message,
          mediaUrl: mediaUrl.trim() || undefined,
          mediaType: mediaUrl.trim() ? mediaType : undefined
        };

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const res = await axios.post(`${apiUrl}/api/broadcast/send`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });

        if (res.data.success) {
           currentContacts[i] = { ...contact, status: 'sent' };
           sentCount++;
           addLog(`Mensagem enviada para ${contact.number}`, 'success');
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

  return (
    <div className="flex-1 flex flex-col h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden animate-fade-up rounded-3xl lg:m-2">
      <div className="p-6 border-b border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/50 flex justify-between items-center">
        <h2 className="font-podium text-2xl uppercase tracking-widest text-black dark:text-white">Disparos (Broadcast)</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 hide-scrollbar flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Input and config */}
        <div className="flex-1 space-y-6 flex flex-col">
          
          <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/10 dark:border-white/10">
            <h3 className="font-inter text-xs font-bold uppercase tracking-widest text-black/70 dark:text-white/70 mb-3 flex items-center gap-2">
              <Users size={16} /> Contatos (1 por linha)
            </h3>
            <textarea
              value={rawContacts}
              onChange={e => setRawContacts(e.target.value)}
              placeholder="5511999999999&#10;5511888888888"
              className="w-full bg-transparent border border-black/20 dark:border-white/20 p-3 text-black dark:text-white font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors resize-none rounded-xl h-24 mb-3"
            />
            <div className="flex justify-between items-center">
              <span className="font-inter text-[10px] tracking-widest uppercase text-black/50 dark:text-white/50 font-bold">
                Total na lista: {targetContacts.length}
              </span>
              <button 
                onClick={parseContacts}
                className="bg-black dark:bg-white text-white dark:text-black font-inter tracking-widest text-[10px] uppercase font-bold py-2 px-4 rounded-xl hover:scale-105 transition-transform"
              >
                Carregar
              </button>
            </div>
          </div>

          <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/10 dark:border-white/10">
             <h3 className="font-inter text-xs font-bold uppercase tracking-widest text-black/70 dark:text-white/70 mb-3 flex items-center gap-2">
              <MessageSquare size={16} /> Mensagem
            </h3>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Sua mensagem de promoção aqui..."
              className="w-full bg-transparent border border-black/20 dark:border-white/20 p-3 text-black dark:text-white font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors resize-none rounded-xl h-32"
            />
          </div>

          <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/10 dark:border-white/10">
             <h3 className="font-inter text-xs font-bold uppercase tracking-widest text-black/70 dark:text-white/70 mb-3 flex items-center gap-2">
              <ImageIcon size={16} /> Mídia (Opcional)
            </h3>
            <div className="flex gap-3">
              <select 
                value={mediaType} 
                onChange={e => setMediaType(e.target.value as any)}
                className="bg-transparent border border-black/20 dark:border-white/20 p-3 text-black dark:text-white font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white rounded-xl"
              >
                <option value="image">Imagem</option>
                <option value="video">Vídeo</option>
              </select>
              <input
                type="text"
                value={mediaUrl}
                onChange={e => setMediaUrl(e.target.value)}
                placeholder="URL da mídia (ex: https://site.com/foto.jpg)"
                className="flex-1 bg-transparent border border-black/20 dark:border-white/20 p-3 text-black dark:text-white font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-xl"
              />
            </div>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl text-orange-700 dark:text-orange-500">
             <h3 className="font-inter text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
              <Settings size={16} /> Anti-Banimento (Delay Variável)
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-widest font-bold block mb-1">Mínimo (segundos)</label>
                <input type="number" value={minDelay} onChange={e => setMinDelay(Number(e.target.value))} className="w-full bg-transparent border border-orange-500/50 p-2 rounded-xl text-sm outline-none" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-widest font-bold block mb-1">Máximo (segundos)</label>
                <input type="number" value={maxDelay} onChange={e => setMaxDelay(Number(e.target.value))} className="w-full bg-transparent border border-orange-500/50 p-2 rounded-xl text-sm outline-none" />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Logs & Controls */}
        <div className="flex-1 flex flex-col space-y-4">
          <div className="flex-1 bg-black/90 dark:bg-[#050505] p-4 rounded-2xl border border-black/20 dark:border-white/10 font-mono text-xs overflow-y-auto flex flex-col gap-1 min-h-[300px]">
            {logs.length === 0 && <div className="text-white/30 italic">Logs do sistema aparecerão aqui...</div>}
            {logs.map(log => (
              <div key={log.id} className={`
                ${log.status === 'success' ? 'text-green-400' : ''}
                ${log.status === 'error' ? 'text-red-400' : ''}
                ${log.status === 'pending' ? 'text-blue-300' : ''}
              `}>
                <span className="text-white/40">[{log.timestamp.toLocaleTimeString()}]</span> {log.text}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>

          <div className="flex gap-3">
            {!isSending ? (
              <button
                onClick={startBroadcast}
                className="flex-1 bg-black dark:bg-white text-white dark:text-black font-inter tracking-widest text-[11px] font-bold uppercase py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform"
              >
                <Play size={16} />
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
                  className="flex-1 bg-yellow-500 text-white font-inter tracking-widest text-[11px] font-bold uppercase py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                >
                  {isPausedUI ? <Play size={16} /> : <Pause size={16} />}
                  {isPausedUI ? 'Retomar' : 'Pausar'}
                </button>
                <button
                  onClick={() => {
                    if (confirm('Tem certeza que deseja cancelar o disparo?')) {
                      isCancelledRef.current = true;
                      addLog('Cancelando...', 'error');
                    }
                  }}
                  className="flex-1 bg-red-500 text-white font-inter tracking-widest text-[11px] font-bold uppercase py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                >
                  <Square size={16} />
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
