import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Users, Server, ShoppingCart, Activity, ListOrdered, Edit3, X, Save } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

export default function AdminPanel() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMerchant, setEditingMerchant] = useState<any>(null);
  const [planForm, setPlanForm] = useState({ planStatus: 'active', planExpiresAt: '' });
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
      planExpiresAt: merchant.planExpiresAt ? new Date(merchant.planExpiresAt).toISOString().split('T')[0] : ''
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
      <div className="p-6 md:p-10 border-b border-black/10 dark:border-white/10 bg-white/30 dark:bg-black/20 flex items-center gap-4">
        <Server className="w-8 h-8 text-black dark:text-white" />
        <div>
          <h1 className="font-podium text-2xl uppercase tracking-widest text-black dark:text-white">
            Painel de Administração
          </h1>
          <p className="font-inter text-black/60 dark:text-white/60 text-xs tracking-widest mt-1">
            Monitoramento de todos os Lojistas / Clientes
          </p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col gap-6 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/60 dark:bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-black/10 dark:border-white/10 flex items-center gap-4 shadow-sm">
             <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl text-black dark:text-white"><Users /></div>
             <div>
               <div className="text-[10px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">Total Lojistas</div>
               <div className="text-2xl font-podium mt-1 text-black dark:text-white">{merchants.length}</div>
             </div>
          </div>
          <div className="bg-white/60 dark:bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-black/10 dark:border-white/10 flex items-center gap-4 shadow-sm">
             <div className="bg-emerald-500/10 p-4 rounded-xl text-emerald-600 dark:text-emerald-400"><Activity /></div>
             <div>
               <div className="text-[10px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">Ativos</div>
               <div className="text-2xl font-podium mt-1 text-black dark:text-white">{merchants.filter(m => m.active).length}</div>
             </div>
          </div>
          <div className="bg-white/60 dark:bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-black/10 dark:border-white/10 flex items-center gap-4 shadow-sm">
             <div className="bg-blue-500/10 p-4 rounded-xl text-blue-600 dark:text-blue-400"><ShoppingCart /></div>
             <div>
               <div className="text-[10px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">Total Pedidos</div>
               <div className="text-2xl font-podium mt-1 text-black dark:text-white">{merchants.reduce((acc, m) => acc + m._count.orders, 0)}</div>
             </div>
          </div>
          <div className="bg-white/60 dark:bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-black/10 dark:border-white/10 flex items-center gap-4 shadow-sm">
             <div className="bg-purple-500/10 p-4 rounded-xl text-purple-600 dark:text-purple-400"><ListOrdered /></div>
             <div>
               <div className="text-[10px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">Listas Salvas</div>
               <div className="text-2xl font-podium mt-1 text-black dark:text-white">{merchants.reduce((acc, m) => acc + m._count.savedLists, 0)}</div>
             </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-white/60 dark:bg-black/60 backdrop-blur-md rounded-[2rem] border border-black/10 dark:border-white/10 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-black/5 dark:border-white/5 flex justify-between items-center shrink-0">
            <h2 className="font-podium text-lg uppercase tracking-widest text-black dark:text-white">Lojistas / Clientes</h2>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse font-inter text-sm relative">
              <thead className="sticky top-0 z-10 bg-white/90 dark:bg-black/90 backdrop-blur-md">
                <tr className="bg-black/5 dark:bg-white/5 text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10">Nome</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10">Slug</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10">Status</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10">API / Instância</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10">Plano</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10">Vencimento</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10">Pedidos</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10">Produtos</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10">Ações</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((merchant, i) => {
                  let config: any = {};
                  try { config = JSON.parse(merchant.whatsappConfig || '{}'); } catch(e) {}
                  
                  return (
                    <tr key={merchant.id} className={`text-black dark:text-white transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${i !== merchants.length - 1 ? 'border-b border-black/5 dark:border-white/5' : ''}`}>
                      <td className="p-4 font-bold">{merchant.name}</td>
                      <td className="p-4 text-black/60 dark:text-white/60">/{merchant.slug}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${merchant.active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'}`}>
                          {merchant.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="p-4">
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
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${merchant.planStatus === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'}`}>
                          {merchant.planStatus === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-bold font-mono">
                        {merchant.planExpiresAt ? new Date(merchant.planExpiresAt).toLocaleDateString('pt-BR') : 'N/A'}
                      </td>
                      <td className="p-4 font-bold">{merchant._count.orders}</td>
                      <td className="p-4 font-bold">{merchant._count.products}</td>
                      <td className="p-4">
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
                <select 
                  value={planForm.planStatus}
                  onChange={e => setPlanForm({ ...planForm, planStatus: e.target.value })}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-black dark:text-white font-inter focus:outline-none"
                >
                  <option className="bg-white dark:bg-[#121215] text-black dark:text-white" value="active">Ativo (Pode usar e receber pedidos)</option>
                  <option className="bg-white dark:bg-[#121215] text-black dark:text-white" value="inactive">Inativo (Bloqueado)</option>
                </select>
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
