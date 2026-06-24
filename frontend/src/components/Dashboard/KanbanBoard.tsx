import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, MessageCircle } from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  product: { name: string };
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  status: 'PENDING' | 'PREPARING' | 'SHIPPED' | 'FINISHED';
  createdAt: string;
  observation?: string;
  items: OrderItem[];
}

const COLUMNS = [
  { id: 'PENDING', title: 'NOVOS PEDIDOS' },
  { id: 'PREPARING', title: 'PREPARANDO' },
  { id: 'SHIPPED', title: 'SAIU PRA ENTREGA' },
  { id: 'FINISHED', title: 'FINALIZADO' },
] as const;

export default function KanbanBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/orders', {
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
    const interval = setInterval(fetchOrders, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    // Optimistic update
    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus as any } : o));
    try {
      await axios.patch(`http://localhost:3001/api/orders/${id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (error) {
      alert('Erro ao atualizar status');
      fetchOrders(); // Revert on failure
    }
  };

  const filteredOrders = orders.filter(order => {
    if (!selectedDate) return true;
    const orderDateStr = new Date(order.createdAt).toISOString().split('T')[0];
    return orderDateStr === selectedDate;
  });

  const today = new Date();
  const maxDate = today.toISOString().split('T')[0];
  const minDateObj = new Date();
  minDateObj.setFullYear(today.getFullYear() - 20);
  const minDate = minDateObj.toISOString().split('T')[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden animate-fade-up">
      <div className="p-6 border-b border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="font-podium text-2xl uppercase tracking-widest text-black dark:text-white">Gestão de Pedidos</h2>
        <div className="flex items-center gap-4 w-full md:w-auto">
          
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minDate}
              max={maxDate}
              className="bg-white/10 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white font-inter tracking-widest text-[10px] sm:text-xs font-bold uppercase px-4 py-3 focus:outline-none focus:border-black/30 dark:focus:border-white/30 cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
            />
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate('')} 
                className="text-[10px] uppercase tracking-widest font-bold border-b border-black/50 dark:border-white/50 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
              >
                Ver Todos
              </button>
            )}
          </div>

          <button 
            onClick={fetchOrders} 
            className="bg-white/10 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 text-black dark:text-white font-inter tracking-widest text-[10px] font-bold uppercase px-6 py-3 flex items-center gap-2 transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">ATUALIZAR</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6 hide-scrollbar">
        <div className="flex gap-6 h-full min-w-max">
          {COLUMNS.map(column => (
            <div key={column.id} className="w-[320px] flex flex-col bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 h-full backdrop-blur-md">
              <div className="p-4 bg-white/10 dark:bg-black/40 border-b border-black/10 dark:border-white/10 font-inter font-bold tracking-widest text-xs uppercase flex justify-between items-center text-black dark:text-white">
                <span>{column.title}</span>
                <span className="bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 text-[10px]">{filteredOrders.filter(o => o.status === column.id).length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
                {filteredOrders.filter(o => o.status === column.id).map(order => (
                  <div key={order.id} className="bg-white/60 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10 p-5 shadow-lg group">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-inter font-bold uppercase tracking-wider text-sm truncate max-w-[150px] text-black dark:text-white">{order.customerName}</span>
                      <span className="font-inter font-bold text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-2 py-1 text-black dark:text-white tracking-widest">
                        {(order.totalAmount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    
                    <a href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-inter font-semibold tracking-wider mb-4 hover:underline text-black/70 dark:text-white/70">
                      <MessageCircle size={14} className="text-green-500" /> {order.customerPhone}
                    </a>

                    <ul className="text-xs space-y-2 mb-4 border-l border-black/20 dark:border-white/20 pl-3 font-inter text-black/80 dark:text-white/80">
                      {order.items.map(item => (
                        <li key={item.id} className="truncate uppercase tracking-wider"><span className="font-bold">{item.quantity}X</span> {item.product.name}</li>
                      ))}
                    </ul>

                    {order.observation && (
                      <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 p-3 text-xs font-inter text-yellow-700 dark:text-yellow-500">
                        <strong className="block uppercase tracking-widest mb-1 text-[10px]">Observação:</strong>
                        {order.observation}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-black/10 dark:border-white/10">
                      {column.id === 'PENDING' && (
                        <button onClick={() => updateStatus(order.id, 'PREPARING')} className="bg-black dark:bg-white text-white dark:text-black font-inter tracking-widest text-[10px] uppercase font-bold py-3 col-span-2 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors">
                          PREPARAR PEDIDO
                        </button>
                      )}
                      {column.id === 'PREPARING' && (
                        <button onClick={() => updateStatus(order.id, 'SHIPPED')} className="bg-black dark:bg-white text-white dark:text-black font-inter tracking-widest text-[10px] uppercase font-bold py-3 col-span-2 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors">
                          ENVIAR
                        </button>
                      )}
                      {column.id === 'SHIPPED' && (
                        <button onClick={() => updateStatus(order.id, 'FINISHED')} className="bg-black dark:bg-white text-white dark:text-black font-inter tracking-widest text-[10px] uppercase font-bold py-3 col-span-2 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors">
                          FINALIZAR PEDIDO
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
