import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, MessageCircle, DollarSign, ShoppingBag, TrendingUp, Clock, Printer, XCircle } from 'lucide-react';
import { io } from 'socket.io-client';
import { useToastStore } from '../../store/useToastStore';

interface OrderItem {
  id: string;
  quantity: number;
  product: { name: string };
  options?: string;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  status: 'PENDING' | 'PREPARING' | 'SHIPPED' | 'FINISHED' | 'CANCELED';
  createdAt: string;
  observation?: string;
  deliveryType?: string;
  address?: string;
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
  const [showCanceledModal, setShowCanceledModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);

  const fetchOrders = async () => {
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
    const interval = setInterval(fetchOrders, 30000); // Poll every 30s as fallback

    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(import.meta.env.VITE_API_URL || '', {
      auth: { token }
    });

    socket.on('new-order', (order: Order) => {
      setOrders(prev => {
        if (prev.find(o => o.id === order.id)) return prev;
        return [order, ...prev];
      });
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const printReceipt = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      useToastStore.getState().addToast("Por favor, permita pop-ups para imprimir.", 'error');
      return;
    }

    let itemsHtml = order.items.map(item => {
      let optionsHtml = '';
      if (item.options) {
        try {
          const opts = JSON.parse(item.options);
          optionsHtml = opts.map((opt: any) => `<div>+ ${opt.name}</div>`).join('');
        } catch {}
      }
      return `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <div><b>${item.quantity}x</b> ${item.product.name}</div>
        </div>
        ${optionsHtml ? `<div style="padding-left: 15px; font-size: 10px;">${optionsHtml}</div>` : ''}
      `;
    }).join('');

    const html = `
      <html>
        <head>
          <style>
            body { font-family: monospace; width: 80mm; margin: 0; padding: 0; color: black; font-size: 12px; }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed black; padding-bottom: 10px; }
            .section { margin-bottom: 15px; border-bottom: 1px dashed black; padding-bottom: 10px; }
            .total { font-size: 16px; font-weight: bold; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>PEDIDO #${order.id.slice(-4).toUpperCase()}</h2>
            <div>${new Date(order.createdAt).toLocaleString('pt-BR')}</div>
          </div>
          <div class="section">
            <div><b>Cliente:</b> ${order.customerName}</div>
            <div><b>Tel:</b> ${order.customerPhone}</div>
            ${order.deliveryType === 'DELIVERY' ? `<div><b>Endereço:</b> ${order.address || ''}</div>` : '<div><b>RETIRADA NO LOCAL</b></div>'}
          </div>
          <div class="section">
            ${itemsHtml}
          </div>
          ${order.observation ? `<div class="section"><b>Observação:</b><br/>${order.observation}</div>` : ''}
          <div class="section total">
            TOTAL: ${(order.totalAmount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <div style="text-align: center; margin-top: 20px;">*** ZAPGARÇOM ***</div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const updateStatus = async (id: string, newStatus: string) => {
    // Optimistic update
    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus as any } : o));
    try {
      await axios.patch(`/api/orders/${id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (error) {
      useToastStore.getState().addToast('Erro ao atualizar status', 'error');
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

  const nonCanceledOrders = filteredOrders.filter(o => o.status !== 'CANCELED');
  const totalRevenue = nonCanceledOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalOrders = nonCanceledOrders.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const pendingOrders = filteredOrders.filter(o => o.status === 'PENDING').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden animate-fade-up rounded-3xl lg:m-2">
      <div className="p-6 border-b border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="font-podium text-2xl uppercase tracking-widest text-black dark:text-white">Gestão de Pedidos</h2>
        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto hide-scrollbar pb-2 md:pb-0">
          <button 
            onClick={() => setShowCanceledModal(true)}
            className="shrink-0 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 font-inter tracking-widest text-[10px] font-bold uppercase px-4 py-3 flex items-center gap-2 transition-all rounded-xl"
          >
            <XCircle size={14} />
            <span className="hidden sm:inline">CANCELADOS ({filteredOrders.filter(o => o.status === 'CANCELED').length})</span>
            <span className="sm:hidden">{filteredOrders.filter(o => o.status === 'CANCELED').length}</span>
          </button>

          <div className="flex items-center gap-3 shrink-0">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minDate}
              max={maxDate}
              className="bg-white/10 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white font-inter tracking-widest text-[10px] sm:text-xs font-bold uppercase px-4 py-3 focus:outline-none focus:border-black/30 dark:focus:border-white/30 cursor-pointer [color-scheme:light] dark:[color-scheme:dark] rounded-xl"
            />
          </div>

          <button 
            onClick={fetchOrders} 
            className="bg-white/10 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 text-black dark:text-white font-inter tracking-widest text-[10px] font-bold uppercase px-6 py-3 flex items-center gap-2 transition-all rounded-xl"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">ATUALIZAR</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 md:p-6 bg-white/30 dark:bg-black/30 border-b border-black/10 dark:border-white/10">
        <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 p-4 rounded-2xl flex items-center gap-4">
          <div className="bg-green-500/20 text-green-600 dark:text-green-400 p-3 rounded-xl"><DollarSign size={24} /></div>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-black/50 dark:text-white/50 uppercase">Faturamento</p>
            <p className="font-podium text-xl text-black dark:text-white">{(totalRevenue / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
        </div>
        <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 p-4 rounded-2xl flex items-center gap-4">
          <div className="bg-blue-500/20 text-blue-600 dark:text-blue-400 p-3 rounded-xl"><ShoppingBag size={24} /></div>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-black/50 dark:text-white/50 uppercase">Pedidos</p>
            <p className="font-podium text-xl text-black dark:text-white">{totalOrders}</p>
          </div>
        </div>
        <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 p-4 rounded-2xl flex items-center gap-4">
          <div className="bg-purple-500/20 text-purple-600 dark:text-purple-400 p-3 rounded-xl"><TrendingUp size={24} /></div>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-black/50 dark:text-white/50 uppercase">Ticket Médio</p>
            <p className="font-podium text-xl text-black dark:text-white">{(avgTicket / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
        </div>
        <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 p-4 rounded-2xl flex items-center gap-4">
          <div className="bg-orange-500/20 text-orange-600 dark:text-orange-400 p-3 rounded-xl"><Clock size={24} /></div>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-black/50 dark:text-white/50 uppercase">Pendentes</p>
            <p className="font-podium text-xl text-black dark:text-white">{pendingOrders}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4 md:p-6 hide-scrollbar">
        <div className="flex gap-3 md:gap-4 lg:gap-6 h-full min-w-[800px] lg:min-w-0">
          {COLUMNS.map(column => (
            <div key={column.id} className="flex-1 min-w-[220px] max-w-[400px] flex flex-col bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 h-full backdrop-blur-md rounded-2xl overflow-hidden">
              <div className="p-4 bg-white/10 dark:bg-black/40 border-b border-black/10 dark:border-white/10 font-inter font-bold tracking-widest text-xs uppercase flex justify-between items-center text-black dark:text-white">
                <span>{column.title}</span>
                <span className="bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 text-[10px] rounded-lg">{filteredOrders.filter(o => o.status === column.id).length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
                {filteredOrders.filter(o => o.status === column.id).map(order => (
                  <div key={order.id} className="bg-white/60 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10 p-5 shadow-lg group rounded-2xl">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-inter font-bold uppercase tracking-wider text-sm truncate max-w-[150px] text-black dark:text-white">{order.customerName}</span>
                      <span className="font-inter font-bold text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-2 py-1 text-black dark:text-white tracking-widest rounded-lg">
                        {(order.totalAmount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center mb-4">
                      <a href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-inter font-semibold tracking-wider hover:underline text-black/70 dark:text-white/70">
                        <MessageCircle size={14} className="text-green-500" /> {order.customerPhone}
                      </a>
                      <button 
                        onClick={() => printReceipt(order)}
                        className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors p-1"
                        title="Imprimir Comanda"
                      >
                        <Printer size={16} />
                      </button>
                    </div>

                    <ul className="text-xs space-y-2 mb-4 border-l border-black/20 dark:border-white/20 pl-3 font-inter text-black/80 dark:text-white/80">
                      {order.items.map(item => {
                        let parsedOptions: any[] = [];
                        if (item.options) {
                          try { parsedOptions = JSON.parse(item.options); } catch(e) {}
                        }
                        return (
                          <li key={item.id} className="tracking-wider">
                            <span className="font-bold uppercase">{item.quantity}X</span> <span className="uppercase">{item.product.name}</span>
                            {parsedOptions.length > 0 && (
                              <div className="pl-4 mt-1 space-y-1">
                                {parsedOptions.map((opt: any, idx: number) => (
                                  <div key={idx} className="text-[10px] text-black/50 dark:text-white/50 tracking-widest uppercase">
                                    + {opt.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    {order.observation && (
                      <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 p-3 text-xs font-inter text-yellow-700 dark:text-yellow-500 rounded-xl">
                        <strong className="block uppercase tracking-widest mb-1 text-[10px]">Observação:</strong>
                        {order.observation}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-black/10 dark:border-white/10">
                      {column.id === 'PENDING' && (
                        <button onClick={() => updateStatus(order.id, 'PREPARING')} className="bg-black dark:bg-white text-white dark:text-black font-inter tracking-widest text-[10px] uppercase font-bold py-3 col-span-2 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors rounded-xl">
                          PREPARAR PEDIDO
                        </button>
                      )}
                      {column.id === 'PREPARING' && (
                        <button onClick={() => updateStatus(order.id, 'SHIPPED')} className="bg-black dark:bg-white text-white dark:text-black font-inter tracking-widest text-[10px] uppercase font-bold py-3 col-span-2 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors rounded-xl">
                          ENVIAR
                        </button>
                      )}
                      {column.id === 'SHIPPED' && (
                        <button onClick={() => updateStatus(order.id, 'FINISHED')} className="bg-black dark:bg-white text-white dark:text-black font-inter tracking-widest text-[10px] uppercase font-bold py-3 col-span-2 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors rounded-xl">
                          FINALIZAR PEDIDO
                        </button>
                      )}
                      {order.status !== 'CANCELED' && order.status !== 'FINISHED' && (
                        <button 
                          onClick={() => setOrderToCancel(order.id)}
                          className="col-span-2 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 font-inter tracking-widest text-[9px] uppercase font-bold py-2 transition-colors rounded-xl mt-1"
                        >
                          Cancelar Pedido
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

      {showCanceledModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#f0f0f0] dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 w-full max-w-5xl h-[85vh] flex flex-col rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="p-6 border-b border-black/10 dark:border-white/10 flex justify-between items-center bg-white/50 dark:bg-white/5">
              <h2 className="font-podium text-2xl uppercase tracking-widest text-black dark:text-white flex items-center gap-3">
                <XCircle className="text-red-500" size={28} /> 
                Pedidos Cancelados
              </h2>
              <button 
                onClick={() => setShowCanceledModal(false)}
                className="text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white transition-colors px-4 py-2 bg-black/5 dark:bg-white/5 font-inter font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-black/10 dark:hover:bg-white/10"
              >
                FECHAR
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-transparent">
              {filteredOrders.filter(o => o.status === 'CANCELED').length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-black/40 dark:text-white/40">
                  <XCircle size={64} className="mb-4 opacity-30" />
                  <p className="font-inter font-bold tracking-widest text-sm uppercase">Nenhum pedido cancelado nesta data</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOrders.filter(o => o.status === 'CANCELED').map(order => (
                    <div key={order.id} className="bg-white/60 dark:bg-[#151515] backdrop-blur-md border border-red-500/20 p-5 shadow-lg group rounded-2xl relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 bg-red-500/10 w-24 h-24 rounded-full blur-xl pointer-events-none"></div>
                      
                      <div className="flex justify-between items-start mb-3 relative z-10">
                        <span className="font-inter font-bold uppercase tracking-wider text-sm truncate max-w-[150px] text-black/70 dark:text-white/70 line-through decoration-red-500/50">{order.customerName}</span>
                        <span className="font-inter font-bold text-xs bg-red-500/10 border border-red-500/20 px-2 py-1 text-red-600 dark:text-red-400 tracking-widest rounded-lg">
                          {(order.totalAmount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center mb-4 relative z-10">
                        <span className="flex items-center gap-2 text-xs font-inter font-semibold tracking-wider text-black/50 dark:text-white/50">
                          <MessageCircle size={14} className="text-black/30 dark:text-white/30" /> {order.customerPhone}
                        </span>
                        <button onClick={() => printReceipt(order)} className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors p-1" title="Imprimir Comanda">
                          <Printer size={16} />
                        </button>
                      </div>

                      <ul className="text-xs space-y-2 border-l border-black/10 dark:border-white/10 pl-3 font-inter text-black/60 dark:text-white/60 relative z-10">
                        {order.items.map(item => {
                          let parsedOptions: any[] = [];
                          if (item.options) {
                            try { parsedOptions = JSON.parse(item.options); } catch(e) {}
                          }
                          return (
                            <li key={item.id} className="tracking-wider">
                              <span className="font-bold uppercase">{item.quantity}X</span> <span className="uppercase">{item.product.name}</span>
                              {parsedOptions.length > 0 && (
                                <div className="pl-4 mt-1 space-y-1">
                                  {parsedOptions.map((opt: any, idx: number) => (
                                    <div key={idx} className="text-[10px] text-black/40 dark:text-white/40 tracking-widest uppercase">
                                      + {opt.name}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      
                      {order.observation && (
                        <div className="mt-4 bg-black/5 dark:bg-white/5 p-3 text-xs font-inter text-black/50 dark:text-white/50 rounded-xl relative z-10">
                          <strong className="block uppercase tracking-widest mb-1 text-[10px]">Observação:</strong>
                          {order.observation}
                        </div>
                      )}
                      
                      <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10 text-center relative z-10">
                        <span className="font-inter font-bold text-[9px] uppercase tracking-widest text-red-500/70">Cancelado às {new Date(order.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {orderToCancel && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="bg-red-500/10 text-red-500 p-4 rounded-full mb-4">
              <XCircle size={48} />
            </div>
            <h3 className="font-podium text-xl uppercase tracking-widest text-black dark:text-white mb-2">Cancelar Pedido?</h3>
            <p className="font-inter text-xs text-black/60 dark:text-white/60 mb-8">Esta ação não pode ser desfeita e o pedido será removido da produção.</p>
            
            <div className="flex w-full gap-3">
              <button 
                onClick={() => setOrderToCancel(null)}
                className="flex-1 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white font-inter tracking-widest text-[10px] font-bold uppercase py-3 rounded-xl transition-colors"
              >
                Voltar
              </button>
              <button 
                onClick={() => {
                  updateStatus(orderToCancel, 'CANCELED');
                  setOrderToCancel(null);
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-inter tracking-widest text-[10px] font-bold uppercase py-3 rounded-xl transition-colors"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
