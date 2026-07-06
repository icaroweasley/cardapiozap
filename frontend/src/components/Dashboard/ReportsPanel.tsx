import { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, DollarSign, ShoppingBag, Package, RefreshCw } from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  product: { name: string };
  price: number;
}

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

export default function ReportsPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/orders', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setOrders(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const validOrders = orders.filter(o => o.status !== 'CANCELED');
  const totalRevenue = validOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalOrders = validOrders.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Product ranking
  const productRanking: Record<string, { quantity: number, revenue: number }> = {};
  
  validOrders.forEach(order => {
    order.items.forEach(item => {
      const name = item.product.name;
      if (!productRanking[name]) {
        productRanking[name] = { quantity: 0, revenue: 0 };
      }
      productRanking[name].quantity += item.quantity;
      productRanking[name].revenue += (item.price * item.quantity);
    });
  });

  const sortedProducts = Object.entries(productRanking)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10); // Top 10

  return (
    <div className="flex-1 flex flex-col h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden animate-fade-up rounded-3xl lg:m-2">
      <div className="p-6 border-b border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/50 flex justify-between items-center">
        <h2 className="font-podium text-2xl uppercase tracking-widest text-black dark:text-white">Relatórios Gerais</h2>
        <button 
          onClick={fetchOrders} 
          className="bg-white/10 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 text-black dark:text-white font-inter tracking-widest text-[10px] font-bold uppercase px-6 py-3 flex items-center gap-2 transition-all rounded-xl"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">ATUALIZAR</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 hide-scrollbar">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 p-6 rounded-3xl flex items-center gap-6 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 bg-green-500/20 w-32 h-32 rounded-full blur-2xl group-hover:bg-green-500/30 transition-colors"></div>
            <div className="bg-green-500/20 text-green-600 dark:text-green-400 p-4 rounded-2xl relative z-10"><DollarSign size={32} /></div>
            <div className="relative z-10">
              <p className="text-xs font-bold tracking-[0.2em] text-black/50 dark:text-white/50 uppercase mb-1">Faturamento Total</p>
              <p className="font-podium text-3xl text-black dark:text-white">{(totalRevenue / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </div>
          
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 p-6 rounded-3xl flex items-center gap-6 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 bg-blue-500/20 w-32 h-32 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-colors"></div>
            <div className="bg-blue-500/20 text-blue-600 dark:text-blue-400 p-4 rounded-2xl relative z-10"><ShoppingBag size={32} /></div>
            <div className="relative z-10">
              <p className="text-xs font-bold tracking-[0.2em] text-black/50 dark:text-white/50 uppercase mb-1">Pedidos Concluídos</p>
              <p className="font-podium text-3xl text-black dark:text-white">{totalOrders}</p>
            </div>
          </div>
          
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 p-6 rounded-3xl flex items-center gap-6 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 bg-purple-500/20 w-32 h-32 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-colors"></div>
            <div className="bg-purple-500/20 text-purple-600 dark:text-purple-400 p-4 rounded-2xl relative z-10"><TrendingUp size={32} /></div>
            <div className="relative z-10">
              <p className="text-xs font-bold tracking-[0.2em] text-black/50 dark:text-white/50 uppercase mb-1">Ticket Médio Geral</p>
              <p className="font-podium text-3xl text-black dark:text-white">{(avgTicket / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 p-8 rounded-3xl shadow-xl">
          <div className="flex items-center gap-3 mb-8">
            <Package className="text-black/50 dark:text-white/50" />
            <h3 className="font-podium text-xl uppercase tracking-widest text-black dark:text-white">Produtos Mais Vendidos</h3>
          </div>
          
          {sortedProducts.length === 0 ? (
            <p className="font-inter text-sm text-black/50 dark:text-white/50 text-center py-10 uppercase tracking-widest">Nenhum dado disponível ainda.</p>
          ) : (
            <div className="space-y-4">
              {sortedProducts.map((prod, index) => {
                const maxQty = sortedProducts[0].quantity;
                const percentage = (prod.quantity / maxQty) * 100;
                
                return (
                  <div key={prod.name} className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-3">
                        <span className="font-podium text-lg text-black/30 dark:text-white/30">#{index + 1}</span>
                        <span className="font-inter font-bold text-sm tracking-wider uppercase text-black dark:text-white">{prod.name}</span>
                      </div>
                      <span className="font-inter text-xs tracking-widest text-black/60 dark:text-white/60 font-semibold">{prod.quantity} un.</span>
                    </div>
                    <div className="w-full h-3 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-black/50 to-black dark:from-white/50 dark:to-white rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
