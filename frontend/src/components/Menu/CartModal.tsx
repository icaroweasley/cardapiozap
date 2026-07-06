import { useState, useEffect } from 'react';
import axios from 'axios';
import { useCartStore } from '../../store/useCartStore';
import { useToastStore } from '../../store/useToastStore';
import { X, Minus, Plus, ArrowRight, CheckCircle2 } from 'lucide-react';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchantId: string;
}

export default function CartModal({ isOpen, onClose, merchantId }: CartModalProps) {
  const { items, getTotal, clearCart, updateQuantity } = useCartStore();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    deliveryType: 'DELIVERY',
    street: '',
    number: '',
    neighborhood: '',
    paymentMethod: 'PIX',
    observation: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
    }

    const savedProfile = localStorage.getItem('@zapgarcom:profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setFormData(prev => ({
          ...prev,
          customerName: parsed.customerName || prev.customerName,
          customerPhone: parsed.customerPhone || prev.customerPhone,
          street: parsed.street || prev.street,
          number: parsed.number || prev.number,
          neighborhood: parsed.neighborhood || prev.neighborhood
        }));
      } catch (e) {}
    }

    const params = new URLSearchParams(window.location.search);
    const mesa = params.get('mesa');
    if (mesa) {
      setFormData(prev => ({
        ...prev,
        deliveryType: 'PICKUP',
        observation: `MESA ${mesa}`
      }));
    }
  }, [isOpen]);

  const subtotal = getTotal();
  const taxaEntrega = formData.deliveryType === 'DELIVERY' ? 500 : 0; // R$ 5,00 mock
  const total = subtotal + taxaEntrega;

  const paymentOptions = [
    { id: 'PIX', label: 'PIX', icon: '❖' },
    { id: 'PICPAY', label: 'PICPAY', icon: 'P' },
    { id: 'DINHEIRO', label: 'DINHEIRO', icon: '💵' },
    { id: 'DEBITO', label: 'CARTÃO DE DÉBITO', icon: '💳' },
    { id: 'CREDITO', label: 'CARTÃO DE CRÉDITO', icon: '💳' },
  ];

  const handleOrder = async () => {
    setLoading(true);
    try {
      localStorage.setItem('@zapgarcom:profile', JSON.stringify({
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        street: formData.street,
        number: formData.number,
        neighborhood: formData.neighborhood
      }));

      await axios.post('/api/orders', {
        merchantId,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        deliveryType: formData.deliveryType,
        address: formData.deliveryType === 'DELIVERY' ? `${formData.street}, ${formData.number} - ${formData.neighborhood}` : '',
        paymentMethod: formData.paymentMethod,
        observation: formData.observation,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          options: item.options
        }))
      });
      clearCart();
      setStep(3);
    } catch (error) {
      useToastStore.getState().addToast('Erro ao realizar pedido. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-50 flex justify-end transition-all">
      <div className="bg-neutral-100 dark:bg-[#050505] w-full max-w-md h-full flex flex-col shadow-2xl border-l border-black/10 dark:border-white/10 animate-fade-in text-black dark:text-white font-inter rounded-l-3xl overflow-hidden">
        
        <div className="flex justify-between items-center p-6 border-b border-black/10 dark:border-white/10">
          <h2 className="font-podium text-2xl uppercase tracking-widest text-black dark:text-white">
            {step === 1 ? 'Seu Carrinho' : step === 2 ? 'Pagamento' : 'Pedido Realizado'}
          </h2>
          <button onClick={onClose} className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {step === 1 && (
            <>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-black/30 dark:text-white/30 space-y-4">
                  <p className="font-podium text-xl uppercase tracking-widest">Carrinho vazio</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <ul className="space-y-6">
                    {items.map(item => {
                      const optionsPrice = item.options ? item.options.reduce((acc: number, opt: any) => acc + opt.price, 0) : 0;
                      const itemTotal = item.price + optionsPrice;

                      return (
                      <li key={item.id} className="flex justify-between items-center border-b border-black/10 dark:border-white/10 pb-6">
                        <div className="flex-1 pr-4">
                          <p className="font-inter text-sm font-semibold uppercase tracking-wider text-black/90 dark:text-white/90 mb-1">{item.name}</p>
                          {item.options && item.options.length > 0 && (
                            <ul className="mb-2 space-y-1">
                              {item.options.map((opt: any, idx: number) => (
                                <li key={idx} className="font-inter text-[10px] text-black/50 dark:text-white/50 tracking-widest flex items-center gap-1">
                                  <span className="w-1 h-1 bg-black/30 dark:bg-white/30 rounded-full inline-block"></span>
                                  {opt.name} {opt.price > 0 ? `(+ ${(opt.price / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})` : ''}
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="font-inter text-xs text-black/50 dark:text-white/50 tracking-widest">{(itemTotal / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className="flex items-center gap-4 border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 p-1 rounded-lg">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-black/70 dark:text-white/70 rounded-md"><Minus size={14} /></button>
                          <span className="font-inter font-bold text-sm w-4 text-center text-black dark:text-white">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-black/70 dark:text-white/70 rounded-md"><Plus size={14} /></button>
                        </div>
                      </li>
                    )})}
                  </ul>
                  
                  <button onClick={onClose} className="w-full font-inter text-[10px] tracking-[0.2em] text-black/60 dark:text-white/60 uppercase flex justify-center items-center gap-2 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors border border-black/20 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50 border-dashed rounded-xl">
                    <Plus size={14} /> ADICIONAR MAIS ITENS
                  </button>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block font-inter text-[10px] tracking-widest text-black/50 dark:text-white/50 uppercase mb-2">Nome</label>
                  <input className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-black dark:text-white p-3 font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-xl" placeholder="Ex: João Silva" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                </div>
                <div>
                  <label className="block font-inter text-[10px] tracking-widest text-black/50 dark:text-white/50 uppercase mb-2">Telefone / WhatsApp</label>
                  <input className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-black dark:text-white p-3 font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-xl" placeholder="(00) 00000-0000" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} />
                </div>
              </div>

              <div className="pt-4 border-t border-black/10 dark:border-white/10">
                <label className="block font-inter text-[10px] tracking-widest text-black/50 dark:text-white/50 uppercase mb-3">Método de Entrega</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm bg-black/5 dark:bg-white/5 px-4 py-2 rounded-xl border border-black/10 dark:border-white/10">
                    <input type="radio" name="delivery" value="DELIVERY" checked={formData.deliveryType === 'DELIVERY'} onChange={e => setFormData({...formData, deliveryType: e.target.value})} className="accent-black dark:accent-white" />
                    <span>Entrega</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm bg-black/5 dark:bg-white/5 px-4 py-2 rounded-xl border border-black/10 dark:border-white/10">
                    <input type="radio" name="delivery" value="PICKUP" checked={formData.deliveryType === 'PICKUP'} onChange={e => setFormData({...formData, deliveryType: e.target.value})} className="accent-black dark:accent-white" />
                    <span>Retirada</span>
                  </label>
                </div>
              </div>

              {formData.deliveryType === 'DELIVERY' && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-inter text-[10px] tracking-widest text-black/50 dark:text-white/50 uppercase mb-2">Rua</label>
                    <input className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-black dark:text-white p-3 font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-xl" placeholder="Nome da rua" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block font-inter text-[10px] tracking-widest text-black/50 dark:text-white/50 uppercase mb-2">Número</label>
                      <input className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-black dark:text-white p-3 font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-xl" placeholder="123" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} />
                    </div>
                    <div className="flex-[2]">
                      <label className="block font-inter text-[10px] tracking-widest text-black/50 dark:text-white/50 uppercase mb-2">Bairro</label>
                      <input className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-black dark:text-white p-3 font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-xl" placeholder="Nome do bairro" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-inter text-[10px] tracking-widest text-black/50 dark:text-white/50 uppercase mb-2">Observação (Opcional)</label>
                <textarea className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-black dark:text-white p-3 font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-xl" rows={2} placeholder="Tirar cebola, ponto da carne, etc..." value={formData.observation} onChange={e => setFormData({...formData, observation: e.target.value})}></textarea>
              </div>

              <div className="pt-4 border-t border-black/10 dark:border-white/10">
                <label className="block font-inter text-[10px] tracking-widest text-black/50 dark:text-white/50 uppercase mb-4">Método de Pagamento</label>
                <div className="space-y-3">
                  {paymentOptions.map(opt => (
                    <label key={opt.id} className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors ${formData.paymentMethod === opt.id ? 'border-black dark:border-white bg-black/10 dark:bg-white/10' : 'border-black/10 dark:border-white/10 hover:border-black/40 dark:hover:border-white/40 bg-black/5 dark:bg-white/5'}`}>
                      <div className="flex items-center gap-3">
                        <input 
                          type="radio" 
                          name="payment" 
                          value={opt.id} 
                          checked={formData.paymentMethod === opt.id}
                          onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                          className="w-4 h-4 accent-white bg-transparent"
                        />
                        <span className="font-inter text-sm tracking-wider uppercase font-medium">{opt.label}</span>
                      </div>
                      <span className="text-xl opacity-70">{opt.icon}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 text-center animate-fade-up">
              <CheckCircle2 size={64} className="text-black dark:text-white" />
              <h3 className="font-podium text-3xl uppercase tracking-widest text-black dark:text-white">Pedido Recebido</h3>
              <p className="text-black/60 dark:text-white/60 font-inter text-sm max-w-xs leading-relaxed">
                Seu pedido foi enviado com sucesso para a cozinha. Você receberá atualizações no seu WhatsApp.
              </p>
              <button onClick={onClose} className="mt-8 bg-black dark:bg-white text-white dark:text-black font-inter tracking-widest uppercase text-xs px-8 py-4 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors rounded-xl">
                Voltar ao Menu
              </button>
            </div>
          )}
        </div>

        {step !== 3 && items.length > 0 && (
          <div className="p-6 border-t border-black/10 dark:border-white/10 bg-white dark:bg-black">
            <div className="space-y-3 mb-6 text-sm font-inter text-black/60 dark:text-white/60 uppercase tracking-wider">
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span className="text-black/90 dark:text-white/90">{(subtotal / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              {formData.deliveryType === 'DELIVERY' && (
                <div className="flex justify-between items-center">
                  <span>Taxa de Entrega</span>
                  <span className="text-black/90 dark:text-white/90">{(taxaEntrega / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center mb-6 pt-4 border-t border-black/20 dark:border-white/20">
              <span className="font-inter font-bold tracking-widest uppercase text-lg">TOTAL</span>
              <span className="font-podium text-2xl tracking-widest text-black dark:text-white">{(total / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            
            {step === 1 ? (
              <button 
                onClick={() => setStep(2)}
                className="w-full bg-black dark:bg-white text-white dark:text-black font-inter tracking-[0.2em] font-semibold text-[11px] uppercase py-4 flex items-center justify-center gap-2 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors group rounded-xl"
              >
                AVANÇAR PARA PAGAMENTO
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={() => setStep(1)}
                  className="w-1/3 border border-black/30 dark:border-white/30 text-black dark:text-white font-inter tracking-widest text-[10px] uppercase py-4 hover:bg-black/10 dark:hover:bg-white/10 transition-colors rounded-xl"
                >
                  VOLTAR
                </button>
                <button 
                  onClick={handleOrder}
                  disabled={loading}
                  className="w-2/3 bg-black dark:bg-white text-white dark:text-black font-inter tracking-[0.2em] font-semibold text-[11px] uppercase py-4 flex items-center justify-center gap-2 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 rounded-xl"
                >
                  {loading ? 'PROCESSANDO...' : 'CONFIRMAR PEDIDO'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
