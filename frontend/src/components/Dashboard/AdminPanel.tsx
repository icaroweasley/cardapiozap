import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Server, ShoppingCart, Activity, ListOrdered } from 'lucide-react';

export default function AdminPanel() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

        <div className="bg-white/60 dark:bg-black/60 backdrop-blur-md rounded-[2rem] border border-black/10 dark:border-white/10 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-black/5 dark:border-white/5 flex justify-between items-center">
            <h2 className="font-podium text-lg uppercase tracking-widest text-black dark:text-white">Lojistas / Clientes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-inter text-sm">
              <thead>
                <tr className="bg-black/5 dark:bg-white/5 text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10">Nome</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10">Slug</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10">Status</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10">API / Instância</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10">Pedidos</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10">Produtos</th>
                  <th className="p-4 font-bold border-b border-black/10 dark:border-white/10">Listas Salvas</th>
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
                      <td className="p-4 font-bold">{merchant._count.orders}</td>
                      <td className="p-4 font-bold">{merchant._count.products}</td>
                      <td className="p-4 font-bold text-black/50 dark:text-white/50">{merchant._count.savedLists}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
