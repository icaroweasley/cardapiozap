import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Crown, Clock, ArrowUpRight, Moon, Sun } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useThemeStore } from '../store/useThemeStore';
import CartModal from '../components/Menu/CartModal';
import { ProductCarousel } from '../components/Menu/ProductCarousel';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
}

interface Merchant {
  id: string;
  name: string;
  slug: string;
  planStatus?: string;
  logoUrl?: string;
  businessHours?: string;
  deliveryFee?: number;
  minOrderValue?: number;
  address?: string;
  paymentMethods?: string;
  themeConfig?: any;
  isOpen?: boolean;
  products: Product[];
}

export default function ClientMenu() {
  const { slug } = useParams<{ slug: string }>();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { isDark, toggleTheme } = useThemeStore();
  const { items } = useCartStore();
  const cartItemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  useEffect(() => {
    axios.get(`/api/menu/${slug}`)
      .then(res => setMerchant(res.data))
      .catch(() => {
        setError('Cardápio não encontrado');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-white dark:bg-black text-black dark:text-white font-inter tracking-widest text-sm uppercase animate-pulse">Carregando Cardápio...</div>;
  if (error || !merchant || !Array.isArray(merchant.products)) return <div className="h-screen flex items-center justify-center bg-white dark:bg-black text-black/50 dark:text-white/50 font-inter tracking-widest text-sm uppercase">{error || 'Cardápio Indisponível'}</div>;
  
  if (merchant.planStatus === 'inactive') {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-black text-black dark:text-white font-inter tracking-widest uppercase flex-col gap-4 text-center p-6">
        <Crown className="w-12 h-12 text-black/30 dark:text-white/30" />
        <h1 className="text-xl font-bold">ESTABELECIMENTO TEMPORARIAMENTE INDISPONÍVEL</h1>
        <p className="text-xs text-black/50 dark:text-white/50">O cardápio que você está tentando acessar está desativado no momento.</p>
      </div>
    );
  }

  const categories = Array.from(new Set(merchant.products.map(p => (p.category || '').trim().toUpperCase())));

  return (
    <div className="relative min-h-screen bg-neutral-100 dark:bg-black transition-colors duration-500 pb-32 lg:pb-0 flex flex-col lg:flex-row">
      {/* Background Image (Animated) */}
      {merchant.themeConfig?.backgroundType === 'custom' && merchant.themeConfig?.backgroundValue ? (
        <img
          src={merchant.themeConfig.backgroundValue}
          alt="Custom Background"
          className="fixed inset-0 w-full h-full object-cover opacity-15 dark:opacity-25 pointer-events-none animate-slow-pan transition-opacity duration-500"
        />
      ) : merchant.themeConfig?.backgroundType === 'preset' && merchant.themeConfig?.backgroundValue?.startsWith('img:') ? (
        <img
          src={merchant.themeConfig.backgroundValue.replace('img:', '')}
          alt="Background"
          className="fixed inset-0 w-full h-full object-cover opacity-15 dark:opacity-20 pointer-events-none animate-slow-pan transition-opacity duration-500"
        />
      ) : merchant.themeConfig?.backgroundType === 'preset' && merchant.themeConfig?.backgroundValue ? (
        <div 
          className={`fixed inset-0 w-full h-full opacity-20 dark:opacity-30 pointer-events-none transition-opacity duration-500 ${merchant.themeConfig.backgroundValue}`}
        />
      ) : (
        <img
          src="/bg-burger.png"
          alt="Background"
          className="fixed inset-0 w-full h-full object-cover opacity-10 dark:opacity-20 pointer-events-none animate-slow-pan transition-opacity duration-500"
        />
      )}

      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        className="fixed top-6 right-6 lg:top-10 lg:right-10 z-50 p-3 bg-white/80 dark:bg-black/80 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-full shadow-xl hover:scale-110 transition-all group"
      >
        {isDark ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-black" />}
      </button>

      {/* Left Sidebar (Desktop) / Top Banner (Mobile) */}
      <aside className="w-full lg:w-[350px] xl:w-[400px] shrink-0 border-b lg:border-b-0 lg:border-r border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-md relative z-20 flex flex-col lg:h-screen lg:sticky lg:top-0 transition-colors duration-500 overflow-x-hidden">
        <div className="p-6 sm:p-10 flex-1 flex flex-col h-full lg:overflow-y-auto hide-scrollbar overflow-x-hidden">
          
          <div className="flex items-center justify-between mb-8 gap-4">
            <div className="flex flex-col gap-4 w-full">
              {merchant.logoUrl && (
                <img src={merchant.logoUrl} alt="Logo" className="w-20 h-20 rounded-[2rem] object-cover shadow-lg border-2 border-black/10 dark:border-white/10" />
              )}
              <h1 className="font-podium text-xl sm:text-2xl font-bold uppercase tracking-wider text-black dark:text-white break-words w-full leading-tight" style={{ wordBreak: 'break-word' }}>{merchant.name}</h1>
            </div>
            {!merchant.logoUrl && <Crown className="w-8 h-8 shrink-0 text-black/30 dark:text-white/30 hidden lg:block" />}
          </div>

          {!merchant.isOpen && (
            <div className="mb-8 border border-red-500/30 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <span className="font-podium text-xl tracking-widest uppercase mb-1">Estamos Fechados</span>
              <span className="font-inter text-[10px] tracking-wider uppercase font-bold opacity-70">
                Os pedidos estão temporariamente suspensos
              </span>
            </div>
          )}

          <div className="space-y-4 mb-10 pb-10 border-b border-black/10 dark:border-white/10">
            {merchant.businessHours && (
              <div className="flex items-start gap-2 text-black/80 dark:text-white/80 font-inter text-[10px] sm:text-xs tracking-[0.2em] uppercase">
                <Clock size={14} className="text-black/50 dark:text-white/50 shrink-0 mt-0.5" /> 
                <span className="leading-relaxed">
                  {merchant.businessHours.includes(' das ') ? (
                    <>
                      {merchant.businessHours.split(' das ')[0]}
                      <br />
                      <span className="text-black/50 dark:text-white/50">das {merchant.businessHours.split(' das ')[1]}</span>
                    </>
                  ) : (
                    merchant.businessHours
                  )}
                </span>
              </div>
            )}
            <p className="font-inter text-black dark:text-white text-xs sm:text-sm tracking-widest uppercase font-semibold">
              {(merchant.minOrderValue || 0) > 0 ? `PEDIDO MÍN ${(merchant.minOrderValue! / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} • ` : ''}
              {(merchant.deliveryFee || 0) > 0 ? `ENTREGA ${(merchant.deliveryFee! / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : 'ENTREGA GRÁTIS'}
            </p>
            {(merchant.paymentMethods || merchant.address) && (
              <div className="border-l border-black/30 dark:border-white/30 pl-4 py-1 flex flex-col gap-2">
                {merchant.paymentMethods && (
                  <p className="font-inter text-black/60 dark:text-white/60 text-[10px] leading-relaxed uppercase tracking-wider">
                    {(() => {
                      try {
                        const methods = JSON.parse(merchant.paymentMethods);
                        return Array.isArray(methods) ? methods.join(' • ') : merchant.paymentMethods;
                      } catch {
                        return merchant.paymentMethods;
                      }
                    })()}
                  </p>
                )}
                {merchant.address && (
                  <p className="font-inter text-black/40 dark:text-white/40 text-[9px] leading-relaxed uppercase tracking-widest">
                    {merchant.address}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Categories Navigation */}
          <div className="flex gap-6 lg:flex-col overflow-x-auto lg:overflow-visible hide-scrollbar">
            {categories.map(category => (
              <a 
                key={category} 
                href={`#cat-${category}`} 
                className="font-inter font-medium uppercase text-[10px] sm:text-xs tracking-[0.15em] text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors border-b lg:border-b-0 lg:border-l-2 border-transparent lg:hover:border-black dark:lg:hover:border-white pb-2 lg:pb-0 lg:pl-4 whitespace-nowrap"
              >
                {category}
              </a>
            ))}
          </div>
          
        </div>
      </aside>

      {/* Main Content Grid */}
      <main className="flex-1 min-w-0 relative z-10 p-6 sm:p-10 lg:p-16 lg:pt-10 space-y-16">
        {categories.map((category) => (
          <section key={category} id={`cat-${category}`} className="scroll-mt-32 lg:scroll-mt-10">
            <h2 className="font-podium text-2xl sm:text-3xl text-black dark:text-white uppercase mb-8 tracking-wide flex items-center gap-4">
              <span className="w-8 lg:w-16 h-px bg-black/30 dark:bg-white/30 block"></span>
              {category}
            </h2>
            
            <ProductCarousel 
              category={category} 
              products={merchant.products.filter(p => (p.category || '').trim().toUpperCase() === category)} 
              isOpen={merchant.isOpen !== false}
            />
            
          </section>
        ))}
      </main>

      {/* Cart Button Bar */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 lg:p-10 pointer-events-none animate-fade-up z-30">
          <div className="max-w-4xl mx-auto lg:ml-auto lg:mr-0 pointer-events-auto">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="w-full lg:w-[400px] shadow-2xl group bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 flex justify-between items-center text-sm px-6 py-5 transition-colors border border-black/10 dark:border-white/10 rounded-2xl lg:rounded-3xl"
            >
              <div className="flex items-center gap-4">
                <div className="bg-white dark:bg-black text-black dark:text-white px-3 py-1 font-inter text-[10px] tracking-widest font-bold rounded-lg">
                  {cartItemCount}
                </div>
                <span className="font-inter tracking-[0.2em] font-semibold uppercase">VER CARRINHO</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-inter font-bold tracking-widest">
                  {(useCartStore.getState().getTotal() / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      )}

      <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} merchantId={merchant.id} />
    </div>
  );
}
