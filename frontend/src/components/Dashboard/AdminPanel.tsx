import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Users, Server, ShoppingCart, Activity, ListOrdered, Edit3, X, Save } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';
import CustomSelect from '../CustomSelect';

export default function AdminPanel() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMerchant, setEditingMerchant] = useState<any>(null);
  const [planForm, setPlanForm] = useState({ planStatus: 'active', planExpiresAt: '', accountType: 'FULL', subscriptionPrice: 49.90, isTrial: true, trialBroadcastLimit: 100, paidBroadcastLimit: 1000 });
  const [savingPlan, setSavingPlan] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    const fetchMerchants = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/admin/merchants`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMerchants(res.data);
      } catch (error) {
        console.error('Failed to fetch merchants', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMerchants();
  }, [apiUrl]);

  const handleEditPlan = (merchant: any) => {
    setEditingMerchant(merchant);
    setPlanForm({
      planStatus: merchant.planStatus || 'active',
      planExpiresAt: merchant.planExpiresAt ? new Date(merchant.planExpiresAt).toISOString().split('T')[0] : '',
      accountType: merchant.accountType || 'FULL',
      subscriptionPrice: merchant.subscriptionPrice ?? 49.90,
      isTrial: merchant.isTrial ?? true,
      trialBroadcastLimit: merchant.trialBroadcastLimit ?? 100,
      paidBroadcastLimit: merchant.paidBroadcastLimit ?? 1000
    });
  };

  const handleSavePlan = async () => {
    if (!editingMerchant) return;
    setSavingPlan(true);
    try {
      const res = await axios.put(`${apiUrl}/api/admin/merchants/${editingMerchant.id}/plan`, planForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMerchants(merchants.map(m => m.id === editingMerchant.id ? { ...m, ...res.data } : m));
      setEditingMerchant(null);
    } catch (error) {
      console.error('Failed to update plan', error);
      useToastStore.getState().addToast('Erro ao atualizar plano', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full text-black/50 dark:text-white/50 font-podium tracking-widest uppercase">
        Carregando dados...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white/40 dark:bg-black/40 backdrop-blur-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden animate-fade-up rounded-[2rem] lg:m-2">
      <div className="p-4 md:p-6 border-b border-black/10 dark:border-white/10 bg-white/30 dark:bg-black/20 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <Server className="w-6 h-6 md:w-8 md:h-8 text-black dark:text-white shrink-0" />
          <div className="min-w-0">
            <h1 className="font-podium text-xl md:text-2xl uppercase tracking-widest text-black dark:text-white truncate">
              Painel de Administração
            </h1>
            <p className="font-inter text-black/60 dark:text-white/60 text-[10px] md:text-xs tracking-widest mt-1 truncate">
              Monitoramento de todos os Lojistas / Clientes
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-start xl:justify-end gap-2 overflow-x-auto hide-scrollbar w-full xl:w-auto pb-1 xl:pb-0">
          <div className="flex items-center gap-2 bg-white/60 dark:bg-black/60 border border-black/10 dark:border-white/10 px-3 py-2 rounded-xl shrink-0 shadow-sm">
             <div className="bg-black/5 dark:bg-white/5 p-1.5 rounded-lg text-black dark:text-white"><Users size={14} /></div>
             <div>
               <div className="text-[8px] md:text-[9px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">Total Lojistas</div>
               <div className="text-sm md:text-base font-podium mt-0.5 leading-none text-black dark:text-white">{merchants.length}</div>
             </div>
          </div>
          <div className="flex items-center gap-2 bg-white/60 dark:bg-black/60 border border-black/10 dark:border-white/10 px-3 py-2 rounded-xl shrink-0 shadow-sm">
             <div className="bg-emerald-500/10 p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400"><Activity size={14} /></div>
             <div>
               <div className="text-[8px] md:text-[9px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">Ativos</div>
               <div className="text-sm md:text-base font-podium mt-0.5 leading-none text-black dark:text-white">{merchants.filter(m => m.active).length}</div>
             </div>
          </div>
          <div className="flex items-center gap-2 bg-white/60 dark:bg-black/60 border border-black/10 dark:border-white/10 px-3 py-2 rounded-xl shrink-0 shadow-sm">
             <div className="bg-blue-500/10 p-1.5 rounded-lg text-blue-600 dark:text-blue-400"><ShoppingCart size={14} /></div>
             <div>
               <div className="text-[8px] md:text-[9px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">Total Pedidos</div>
               <div className="text-sm md:text-base font-podium mt-0.5 leading-none text-black dark:text-white">{merchants.reduce((acc, m) => acc + m._count.orders, 0)}</div>
             </div>
          </div>
          <div className="flex items-center gap-2 bg-white/60 dark:bg-black/60 border border-black/10 dark:border-white/10 px-3 py-2 rounded-xl shrink-0 shadow-sm">
             <div className="bg-purple-500/10 p-1.5 rounded-lg text-purple-600 dark:text-purple-400"><ListOrdered size={14} /></div>
             <div>
               <div className="text-[8px] md:text-[9px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">Listas Salvas</div>
               <div className="text-sm md:text-base font-podium mt-0.5 leading-none text-black dark:text-white">{merchants.reduce((acc, m) => acc + m._count.savedLists, 0)}</div>
             </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col min-h-0">

        <div className="flex-1 flex flex-col min-h-0 bg-white/60 dark:bg-black/60 backdrop-blur-md rounded-[2rem] border border-black/10 dark:border-white/10 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-black/5 dark:border-white/5 flex justify-between items-center shrink-0">
            <h2 className="font-podium text-lg uppercase tracking-widest text-black dark:text-white">Lojistas / Clientes</h2>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse font-inter text-sm relative">
              <thead className="sticky top-0 z-10 bg-white/90 dark:bg-black/90 backdrop-blur-md">
                <tr className="bg-black/5 dark:bg-white/5 text-xs uppercase tracking-widest text-black/70 dark:text-white/70">
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10 whitespace-nowrap">Nome</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10 whitespace-nowrap">Slug</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10 whitespace-nowrap">Status</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10 whitespace-nowrap">API / Instância</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10 whitespace-nowrap">Plano</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10 whitespace-nowrap">Tipo Conta</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10 whitespace-nowrap">Mensalidade</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10 whitespace-nowrap">Vencimento</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10 whitespace-nowrap">Disparos (Hoje)</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10 whitespace-nowrap">Pedidos</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10 whitespace-nowrap">Produtos</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10 whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((merchant, i) => {
                  let config: any = {};
                  try { config = JSON.parse(merchant.whatsappConfig || '{}'); } catch(e) {}
                  
                  return (
                    <tr key={merchant.id} className={`text-black dark:text-white transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${i !== merchants.length - 1 ? 'border-b border-black/5 dark:border-white/5' : ''}`}>
                      <td className="p-4 font-bold whitespace-nowrap">{merchant.name}</td>
                      <td className="p-4 text-black/60 dark:text-white/60 whitespace-nowrap">/{merchant.slug}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${merchant.active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'}`}>
                          {merchant.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {merchant.whatsappProvider === 'EVOLUTION' ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] bg-black/5 dark:bg-white/5 px-2 py-1 rounded-md max-w-max border border-black/10 dark:border-white/10 font-mono tracking-widest">Evolution</span>
                            <span className="text-[10px] opacity-60 font-bold uppercase truncate max-w-[150px]">{config.instanceName || 'N/A'}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md max-w-max border border-blue-500/20 font-mono tracking-widest">Oficial</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${merchant.planStatus === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'}`}>
                          {merchant.planStatus === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10`}>
                          {merchant.accountType === 'BROADCAST_ONLY' ? 'Disparos' : 'Completa'}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        R$ {Number(merchant.subscriptionPrice ?? 49.90).toFixed(2).replace('.', ',')}
                      </td>
                      <td className="p-4 text-xs font-bold font-mono whitespace-nowrap">
                        {merchant.planExpiresAt ? new Date(merchant.planExpiresAt).toLocaleDateString('pt-BR') : 'N/A'}
                      </td>
                      <td className="p-4 font-mono text-xs whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className={`${merchant._count.broadcastLogs >= (merchant.isTrial ? merchant.trialBroadcastLimit : merchant.paidBroadcastLimit) ? 'text-red-500' : 'text-emerald-500'}`}>
                            {merchant._count.broadcastLogs || 0} <span className="text-black/40 dark:text-white/40">/ {merchant.isTrial ? merchant.trialBroadcastLimit : merchant.paidBroadcastLimit}</span>
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-bold whitespace-nowrap">{merchant._count.orders}</td>
                      <td className="p-4 font-bold whitespace-nowrap">{merchant._count.products}</td>
                      <td className="p-4 whitespace-nowrap">
                        <button 
                          onClick={() => handleEditPlan(merchant)}
                          className="bg-black/10 dark:bg-white/10 p-2 rounded-xl hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
                          title="Editar Plano"
                        >
                          <Edit3 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Plan Modal using Portal */}
      {editingMerchant && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-inter">
          <div className="bg-white dark:bg-[#121215] border border-black/10 dark:border-white/10 p-8 rounded-3xl shadow-2xl max-w-sm w-full relative animate-fade-up">
            <button onClick={() => setEditingMerchant(null)} className="absolute top-4 right-4 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-black dark:text-white uppercase tracking-widest mb-2 font-podium">
              Editar Plano
            </h2>
            <p className="text-xs text-black/60 dark:text-white/60 mb-6 uppercase tracking-widest">{editingMerchant.name}</p>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">Status do Plano</label>
                <CustomSelect 
                  options={[
                    { value: 'active', label: 'Ativo (Pode usar e receber pedidos)' },
                    { value: 'inactive', label: 'Inativo (Bloqueado)' }
                  ]}
                  value={planForm.planStatus}
                  onChange={value => setPlanForm({ ...planForm, planStatus: value })}
                  className="w-full bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">Data de Vencimento</label>
                <input 
                  type="date"
                  value={planForm.planExpiresAt}
                  onChange={e => setPlanForm({ ...planForm, planExpiresAt: e.target.value })}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-black dark:text-white font-inter focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">Tipo de Conta</label>
                <CustomSelect 
                  options={[
                    { value: 'FULL', label: 'CRM + Disparos (Completa)' },
                    { value: 'BROADCAST_ONLY', label: 'Apenas Disparos' }
                  ]}
                  value={planForm.accountType}
                  onChange={value => setPlanForm({ ...planForm, accountType: value })}
                  className="w-full bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">Preço da Mensalidade (R$)</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={planForm.subscriptionPrice}
                  onChange={e => setPlanForm({ ...planForm, subscriptionPrice: parseFloat(e.target.value) })}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-black dark:text-white font-inter focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">Limite: Contas Teste</label>
                  <input 
                    type="number"
                    min="1"
                    value={planForm.trialBroadcastLimit}
                    onChange={e => setPlanForm({ ...planForm, trialBroadcastLimit: parseInt(e.target.value) })}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-black dark:text-white font-inter focus:outline-none"
                    title="Quantidade de clientes ÚNICOS por dia durante teste"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">Limite: Pagantes</label>
                  <input 
                    type="number"
                    min="1"
                    value={planForm.paidBroadcastLimit}
                    onChange={e => setPlanForm({ ...planForm, paidBroadcastLimit: parseInt(e.target.value) })}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-black dark:text-white font-inter focus:outline-none"
                    title="Quantidade de clientes ÚNICOS por dia após pagar plano"
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={planForm.isTrial}
                      onChange={e => setPlanForm({ ...planForm, isTrial: e.target.checked })}
                    />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${planForm.isTrial ? 'bg-blue-500' : 'bg-black/20 dark:bg-white/20'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${planForm.isTrial ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50">Está em período de teste? (Ignora tolerância de 3 dias no bloqueio)</div>
                </label>
              </div>
            </div>

            <button 
              onClick={handleSavePlan}
              disabled={savingPlan}
              className="w-full bg-black dark:bg-white text-white dark:text-black font-bold text-xs py-4 rounded-xl uppercase tracking-widest transition-transform hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={16} />
              {savingPlan ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
