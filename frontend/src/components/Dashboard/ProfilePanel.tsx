import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, User, Phone, Lock, Image as ImageIcon } from 'lucide-react';

export default function ProfilePanel() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  
  const [backgroundType, setBackgroundType] = useState<'preset' | 'custom'>('preset');
  const [backgroundValue, setBackgroundValue] = useState<string>('');

  const PRESET_BACKGROUNDS = [
    { id: '', label: 'Padrão (Hambúrguer)' },
    { id: 'bg-gradient-to-br from-red-500 to-orange-500', label: 'Quente' },
    { id: 'bg-gradient-to-br from-emerald-500 to-teal-500', label: 'Natural' },
    { id: 'bg-gradient-to-br from-blue-500 to-indigo-500', label: 'Frio' },
    { id: 'bg-gradient-to-br from-purple-500 to-pink-500', label: 'Vibrante' }
  ];

  const PAYMENT_OPTIONS = ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito'];
  const DAYS_OF_WEEK = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  
  const TIME_OPTIONS = Array.from({ length: 48 }).map((_, i) => {
    const h = Math.floor(i / 2).toString().padStart(2, '0');
    const m = i % 2 === 0 ? '00' : '30';
    return `${h}:${m}`;
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const apiUrl = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/auth/settings`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.data) {
          setName(res.data.name || '');
          setSlug(res.data.slug || '');
          setPhone(res.data.phone || '');
          setLogoUrl(res.data.logoUrl || '');
          setDeliveryFee(res.data.deliveryFee ? (res.data.deliveryFee / 100).toFixed(2) : '');
          setMinOrderValue(res.data.minOrderValue ? (res.data.minOrderValue / 100).toFixed(2) : '');
          if (res.data.address) {
            if (res.data.address.includes(' - ')) {
              const parts = res.data.address.split(' - ');
              setAddress(parts[0]);
              setNeighborhood(parts.slice(1).join(' - '));
            } else {
              setAddress(res.data.address);
            }
          }
          if (res.data.paymentMethods) {
            try {
              setPaymentMethods(JSON.parse(res.data.paymentMethods));
            } catch {
              setPaymentMethods(res.data.paymentMethods.split(',').map((s: string) => s.trim()).filter(Boolean));
            }
          }
          if (res.data.businessHours) {
            const match = res.data.businessHours.match(/(.*)\s+das\s+(.*)\s+às\s+(.*)/i);
            if (match) {
              const rawDays = match[1];
              
              // Smart parse days
              const selected = new Set<string>();
              const parts = rawDays.replace(/ e /g, ',').split(',').map((s: string) => s.trim());
              parts.forEach((part: string) => {
                const rangeMatch = part.match(/(.*)\s+a\s+(.*)/i);
                if (rangeMatch) {
                  const start = DAYS_OF_WEEK.findIndex(d => d.toLowerCase() === rangeMatch[1].toLowerCase());
                  const end = DAYS_OF_WEEK.findIndex(d => d.toLowerCase() === rangeMatch[2].toLowerCase());
                  if (start !== -1 && end !== -1 && start <= end) {
                    for (let i = start; i <= end; i++) selected.add(DAYS_OF_WEEK[i]);
                  }
                } else {
                  const found = DAYS_OF_WEEK.find(d => d.toLowerCase() === part.toLowerCase());
                  if (found) selected.add(found);
                }
              });
              if (rawDays.toLowerCase() === 'todos os dias') {
                DAYS_OF_WEEK.forEach(d => selected.add(d));
              }

              setSelectedDays(Array.from(selected));
              setOpenTime(match[2]);
              setCloseTime(match[3]);
            }
          }
          if (res.data.themeConfig) {
             const theme = typeof res.data.themeConfig === 'string' ? JSON.parse(res.data.themeConfig) : res.data.themeConfig;
             setBackgroundType(theme.backgroundType || 'preset');
             setBackgroundValue(theme.backgroundValue || '');
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
  }, [apiUrl]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 512;
        let width = img.width; let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, width, height);
        setLogoUrl(canvas.toDataURL('image/png', 0.9));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const formatDays = (days: string[]) => {
    if (days.length === 7) return 'Todos os dias';
    if (days.length === 0) return '';
    
    const sortedIndexes = days.map(d => DAYS_OF_WEEK.indexOf(d)).sort((a, b) => a - b);
    const result: string[] = [];
    let start = sortedIndexes[0];
    let end = sortedIndexes[0];

    const pushRange = () => {
      if (start === end) result.push(DAYS_OF_WEEK[start]);
      else if (end === start + 1) result.push(`${DAYS_OF_WEEK[start]} e ${DAYS_OF_WEEK[end]}`);
      else result.push(`${DAYS_OF_WEEK[start]} a ${DAYS_OF_WEEK[end]}`);
    };

    for (let i = 1; i < sortedIndexes.length; i++) {
      if (sortedIndexes[i] === end + 1) {
        end = sortedIndexes[i];
      } else {
        pushRange();
        start = sortedIndexes[i];
        end = sortedIndexes[i];
      }
    }
    pushRange();

    if (result.length > 1) {
      return result.slice(0, -1).join(', ') + ' e ' + result[result.length - 1];
    }
    return result[0];
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      let formattedHours = '';
      if (selectedDays.length > 0 && openTime && closeTime) {
        formattedHours = `${formatDays(selectedDays)} das ${openTime} às ${closeTime}`;
      }

      const updateData: any = {
        name, slug, phone, logoUrl,
        deliveryFee: deliveryFee ? Math.round(parseFloat(deliveryFee.replace(',', '.')) * 100) : 0,
        minOrderValue: minOrderValue ? Math.round(parseFloat(minOrderValue.replace(',', '.')) * 100) : 0,
        address: [address, neighborhood].filter(Boolean).join(' - ') || null,
        paymentMethods: paymentMethods.length > 0 ? JSON.stringify(paymentMethods) : null,
        businessHours: formattedHours || null,
        themeConfig: { backgroundType, backgroundValue }
      };
      if (password) updateData.password = password;

      const res = await axios.put(`${apiUrl}/api/auth/profile`, updateData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      const merchantData = JSON.parse(localStorage.getItem('merchant') || '{}');
      localStorage.setItem('merchant', JSON.stringify({ ...merchantData, name: res.data.name, slug: res.data.slug, logoUrl: res.data.logoUrl }));
      
      setSuccess('Perfil atualizado com sucesso!');
      setPassword('');
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto hide-scrollbar animate-fade-in font-inter w-full relative z-10 pb-20">
      <div className="bg-white/40 dark:bg-black/40 backdrop-blur-3xl border border-black/10 dark:border-white/10 shadow-2xl rounded-[2rem] p-8 max-w-3xl mx-auto w-full mt-10">
        <h2 className="font-podium text-2xl uppercase tracking-widest text-black dark:text-white mb-2">Perfil da Loja</h2>
        <p className="text-sm text-black/60 dark:text-white/60 mb-8">Personalize a identidade e configurações do seu restaurante.</p>

        {success && <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-xs uppercase tracking-widest font-bold text-center">{success}</div>}
        {error && <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-xs uppercase tracking-widest font-bold text-center">{error}</div>}

        <form onSubmit={handleSave} className="space-y-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo Upload */}
            <div className="flex flex-col gap-3 shrink-0 items-center justify-center">
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50">Logo (1:1)</label>
              <div className="relative group w-32 h-32 rounded-full border-2 border-dashed border-black/20 dark:border-white/20 flex items-center justify-center overflow-hidden hover:border-black/50 dark:hover:border-white/50 transition-colors bg-white/50 dark:bg-black/50">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="text-black/30 dark:text-white/30 w-8 h-8" />
                )}
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-[10px] font-bold uppercase tracking-widest text-center px-4">
                  Trocar Logo
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">Nome do Estabelecimento</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40 dark:text-white/40" />
                    <input 
                      className="w-full bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 p-3 pl-11 rounded-xl text-sm focus:outline-none focus:border-black/30 dark:focus:border-white/30 text-black dark:text-white transition-colors font-inter" 
                      value={name} onChange={e => setName(e.target.value)} required 
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40 dark:text-white/40" />
                    <input 
                      className="w-full bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 p-3 pl-11 rounded-xl text-sm focus:outline-none focus:border-black/30 dark:focus:border-white/30 text-black dark:text-white transition-colors font-inter" 
                      value={phone} onChange={e => setPhone(e.target.value)} required 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">Link do Cardápio</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-black/40 dark:text-white/40 text-xs font-bold">zapgarcom.com.br/</span>
                  <input 
                    className="w-full bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 p-3 pl-36 rounded-xl text-sm focus:outline-none focus:border-black/30 dark:focus:border-white/30 text-black dark:text-white transition-colors font-inter" 
                    value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">Senha (Deixe em branco para não alterar)</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40 dark:text-white/40" />
                  <input 
                    type="password"
                    className="w-full bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 p-3 pl-11 rounded-xl text-sm focus:outline-none focus:border-black/30 dark:focus:border-white/30 text-black dark:text-white transition-colors font-inter" 
                    placeholder="******"
                    value={password} onChange={e => setPassword(e.target.value)} 
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-black/10 dark:border-white/10" />
          
          <div className="space-y-4">
            <h3 className="font-podium text-lg uppercase tracking-widest text-black dark:text-white mb-4">Informações de Atendimento</h3>
            
            <div className="flex flex-col gap-4 border border-black/10 dark:border-white/10 rounded-[2rem] p-6 bg-white/30 dark:bg-black/30">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-3">Dias de Atendimento</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      type="button"
                      key={day}
                      onClick={() => setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                      className={`px-3 py-2 text-[10px] uppercase tracking-widest font-bold rounded-xl border transition-all ${selectedDays.includes(day) ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-md scale-105' : 'bg-white/50 dark:bg-black/50 text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'}`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-4 mt-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">Abertura</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 p-3 rounded-xl text-sm focus:outline-none focus:border-black/30 dark:focus:border-white/30 text-black dark:text-white transition-colors font-inter appearance-none cursor-pointer" 
                      value={openTime} onChange={e => setOpenTime(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {TIME_OPTIONS.map(time => <option key={time} value={time}>{time}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-black/50 dark:text-white/50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">Fechamento</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 p-3 rounded-xl text-sm focus:outline-none focus:border-black/30 dark:focus:border-white/30 text-black dark:text-white transition-colors font-inter appearance-none cursor-pointer" 
                      value={closeTime} onChange={e => setCloseTime(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {TIME_OPTIONS.map(time => <option key={time} value={time}>{time}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-black/50 dark:text-white/50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-[2]">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">Endereço Físico (Rua e Nº)</label>
                <input 
                  className="w-full bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 p-3 rounded-xl text-sm focus:outline-none focus:border-black/30 dark:focus:border-white/30 text-black dark:text-white transition-colors font-inter" 
                  placeholder="Rua das Flores, 123"
                  value={address} onChange={e => setAddress(e.target.value)} 
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">Bairro</label>
                <input 
                  className="w-full bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 p-3 rounded-xl text-sm focus:outline-none focus:border-black/30 dark:focus:border-white/30 text-black dark:text-white transition-colors font-inter" 
                  placeholder="Centro"
                  value={neighborhood} onChange={e => setNeighborhood(e.target.value)} 
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">Taxa de Entrega Fixa (R$)</label>
                <input 
                  type="number" step="0.01" min="0"
                  className="w-full bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 p-3 rounded-xl text-sm focus:outline-none focus:border-black/30 dark:focus:border-white/30 text-black dark:text-white transition-colors font-inter [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                  placeholder="0.00"
                  value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} 
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">Valor Mínimo do Pedido (R$)</label>
                <input 
                  type="number" step="0.01" min="0"
                  className="w-full bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 p-3 rounded-xl text-sm focus:outline-none focus:border-black/30 dark:focus:border-white/30 text-black dark:text-white transition-colors font-inter [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                  placeholder="0.00"
                  value={minOrderValue} onChange={e => setMinOrderValue(e.target.value)} 
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">Formas de Pagamento Aceitas</label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_OPTIONS.map(opt => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => setPaymentMethods(prev => prev.includes(opt) ? prev.filter(p => p !== opt) : [...prev, opt])}
                    className={`px-4 py-2 text-[10px] uppercase tracking-widest font-bold rounded-xl border transition-all ${paymentMethods.includes(opt) ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-lg scale-105' : 'bg-white/50 dark:bg-black/50 text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <hr className="border-black/10 dark:border-white/10" />

          <div className="space-y-4">
            <h3 className="font-podium text-lg uppercase tracking-widest text-black dark:text-white mb-4">Aparência do Cardápio</h3>
            <div className="flex flex-col gap-4 border border-black/10 dark:border-white/10 rounded-[2rem] p-6 bg-white/30 dark:bg-black/30">
              
              <div className="flex flex-col gap-4">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50">Fundo da Página</label>
                
                <div className="flex flex-wrap gap-4">
                  {PRESET_BACKGROUNDS.map(bg => (
                    <div 
                      key={bg.label}
                      onClick={() => {
                        setBackgroundType('preset');
                        setBackgroundValue(bg.id);
                      }}
                      className={`cursor-pointer group flex flex-col items-center gap-2`}
                    >
                      <div className={`w-16 h-16 rounded-2xl border-2 transition-all ${backgroundType === 'preset' && backgroundValue === bg.id ? 'border-black dark:border-white scale-110 shadow-xl' : 'border-black/10 dark:border-white/10 opacity-70 group-hover:opacity-100'} overflow-hidden relative`}>
                        {bg.id ? (
                           <div className={`w-full h-full ${bg.id}`}></div>
                        ) : (
                           <img src="/bg-burger.png" className="w-full h-full object-cover opacity-50" alt="Padrão" />
                        )}
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 text-center">{bg.label}</span>
                    </div>
                  ))}

                  <div 
                      onClick={() => setBackgroundType('custom')}
                      className={`cursor-pointer group flex flex-col items-center gap-2 relative`}
                    >
                      <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all bg-black/5 dark:bg-white/5 ${backgroundType === 'custom' ? 'border-black dark:border-white scale-110 shadow-xl' : 'border-black/10 dark:border-white/10 opacity-70 group-hover:opacity-100'} overflow-hidden relative`}>
                        {backgroundType === 'custom' && backgroundValue ? (
                           <img src={backgroundValue} className="w-full h-full object-cover opacity-50" alt="Custom" />
                        ) : (
                           <ImageIcon className="text-black/30 dark:text-white/30 w-6 h-6" />
                        )}
                        <input 
                          type="file" accept="image/*" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const img = new Image();
                              img.onload = () => {
                                const canvas = document.createElement('canvas');
                                const MAX_SIZE = 1200;
                                let width = img.width; let height = img.height;
                                if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
                                else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
                                canvas.width = width; canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                if (ctx) ctx.drawImage(img, 0, 0, width, height);
                                setBackgroundValue(canvas.toDataURL('image/jpeg', 0.8));
                                setBackgroundType('custom');
                              };
                              img.src = event.target?.result as string;
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          title="Fazer Upload de Fundo Próprio"
                        />
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 text-center">Próprio</span>
                    </div>

                </div>
              </div>

            </div>
          </div>

          <div className="pt-4 border-t border-black/10 dark:border-white/10">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-black dark:bg-white text-white dark:text-black font-bold text-xs uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              <Save size={16} /> {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
