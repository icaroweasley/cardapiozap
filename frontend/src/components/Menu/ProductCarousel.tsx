import { useRef, useEffect, useState } from 'react';
import { Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useDraggableScroll } from '../../hooks/useDraggableScroll';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
}

interface ProductCarouselProps {
  products: Product[];
  category: string;
}

export function ProductCarousel({ products, category }: ProductCarouselProps) {
  const { ref, onMouseDown, onMouseLeave, onMouseUp, onMouseMove, isDragging, className } = useDraggableScroll();
  const { items, addItem, updateQuantity } = useCartStore();
  
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [justAdded, setJustAdded] = useState<string[]>([]);

  const handleAdd = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({ productId: product.id, name: product.name, price: product.price });
    setJustAdded(prev => [...prev, product.id]);
    setTimeout(() => {
      setJustAdded(prev => prev.filter(id => id !== product.id));
    }, 1000);
  };

  const updateScrollButtons = () => {
    if (ref.current) {
      const { scrollLeft, scrollWidth, clientWidth } = ref.current;
      setCanScrollLeft(scrollLeft > 30); // Use 30px to ignore the px-6 padding when snapping to the first card
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Initial check
    updateScrollButtons();
    // Re-check after a small delay to allow images to load and expand the container
    const timeout = setTimeout(updateScrollButtons, 500);

    const observer = new ResizeObserver(() => {
      updateScrollButtons();
    });

    observer.observe(el);
    window.addEventListener('resize', updateScrollButtons);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [products]);

  const scrollLeft = () => {
    if (ref.current) ref.current.scrollBy({ left: -300, behavior: 'smooth' });
  };

  const scrollRight = () => {
    if (ref.current) ref.current.scrollBy({ left: 300, behavior: 'smooth' });
  };

  return (
    <div className="relative group -ml-6 -mr-6 lg:-mr-16 lg:-ml-[calc(350px+4rem)] xl:-ml-[calc(400px+4rem)]">
      {canScrollLeft && (
        <button 
          onClick={scrollLeft}
          className="absolute left-6 lg:left-[calc(350px+2rem)] xl:left-[calc(400px+2rem)] top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white dark:bg-black backdrop-blur-md border border-black/20 dark:border-white/20 shadow-2xl flex items-center justify-center rounded-full transition-all hover:scale-110 opacity-70 hover:opacity-100"
        >
          <ChevronLeft className="w-6 h-6 text-black dark:text-white" />
        </button>
      )}

      <div 
        ref={ref}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        onScroll={updateScrollButtons}
        className={`flex overflow-x-auto gap-6 hide-scrollbar pb-6 pr-6 lg:pr-16 pl-[4.5rem] lg:pl-[calc(350px+9rem)] xl:pl-[calc(400px+9rem)] scroll-pl-[4.5rem] lg:scroll-pl-[calc(350px+9rem)] xl:scroll-pl-[calc(400px+9rem)] ${className}`}
      >
        {products.map((product) => {
          const cartItem = items.find((i) => i.productId === product.id);
          const isJustAdded = justAdded.includes(product.id);
          
          return (
          <div 
            key={product.id} 
            className="shrink-0 w-[85vw] sm:w-[380px] lg:w-[420px] flex flex-col justify-between bg-white/40 dark:bg-white/10 backdrop-blur-2xl shadow-xl border border-black/10 dark:border-white/20 p-5 hover:border-black/30 dark:hover:border-white/40 transition-all cursor-default select-none snap-start"
            onDragStart={(e) => e.preventDefault()}
          >
            <div className="flex gap-4 justify-between items-start mb-6">
              <div className="flex-1 min-w-0">
                <h3 className="font-podium text-lg sm:text-xl text-black dark:text-white uppercase tracking-wider truncate mb-2">{product.name}</h3>
                <p className="font-inter text-black/60 dark:text-white/50 text-xs line-clamp-3 leading-relaxed font-medium pr-2">{product.description}</p>
              </div>
              {product.imageUrl ? (
                <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 overflow-hidden bg-white dark:bg-black/80 border border-black/10 dark:border-white/10 shadow-inner">
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                 <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 backdrop-blur-3xl flex flex-col items-center justify-center gap-2 shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent dark:from-white/10 dark:to-transparent opacity-50"></div>
                    <span className="text-black/30 dark:text-white/20 text-[10px] font-podium uppercase relative z-10 tracking-widest text-center leading-tight">SEM<br/>FOTO</span>
                 </div>
              )}
            </div>
            
            <div className="flex items-center justify-between border-t border-black/10 dark:border-white/10 pt-5 mt-auto h-12" onClick={e => e.stopPropagation()}>
              <span className="font-inter font-bold text-black dark:text-white tracking-widest text-sm lg:text-base">
                {(product.price / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              {isJustAdded ? (
                <button className="font-inter text-[10px] tracking-[0.2em] font-bold uppercase text-white border border-green-500/50 px-4 py-2 bg-green-500 transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)] flex items-center justify-center">
                  ✓ ADICIONADO
                </button>
              ) : items.find(i => i.productId === product.id) ? (
                <div className="flex items-center gap-3 border border-green-500/50 bg-green-500 text-white backdrop-blur-md p-1 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                  <button 
                    onClick={() => { 
                      const item = items.find(i => i.productId === product.id);
                      if (item) updateQuantity(product.id, item.quantity - 1); 
                    }} 
                    className="p-1.5 text-white/80 hover:text-white hover:bg-black/20 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-inter font-bold text-xs w-5 text-center text-white">
                    {items.find(i => i.productId === product.id)?.quantity}
                  </span>
                  <button 
                    onClick={() => { 
                      const item = items.find(i => i.productId === product.id);
                      if (item) updateQuantity(product.id, item.quantity + 1); 
                    }} 
                    className="p-1.5 text-white/80 hover:text-white hover:bg-black/20 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={(e) => handleAdd(product, e)}
                  className="font-inter text-[10px] tracking-[0.2em] font-bold uppercase text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                >
                  + ADICIONAR
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {canScrollRight && (
        <button 
          onClick={scrollRight}
          className="absolute right-6 lg:right-16 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white dark:bg-black backdrop-blur-md border border-black/20 dark:border-white/20 shadow-2xl flex items-center justify-center rounded-full transition-all hover:scale-110 opacity-70 hover:opacity-100"
        >
          <ChevronRight className="w-6 h-6 text-black dark:text-white" />
        </button>
      )}
    </div>
  );
}
