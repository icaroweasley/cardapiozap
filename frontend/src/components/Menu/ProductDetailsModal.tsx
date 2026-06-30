import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useToastStore } from '../../store/useToastStore';

interface ProductDetailsModalProps {
  product: any;
  onClose: () => void;
  onAdded?: () => void;
}

export function ProductDetailsModal({ product, onClose, onAdded }: ProductDetailsModalProps) {
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, any[]>>({});
  const { addItem } = useCartStore();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  let images: string[] = [];
  if (product.imageUrl) {
    if (product.imageUrl.startsWith('[')) {
      try { images = JSON.parse(product.imageUrl); } catch(e) { images = [product.imageUrl]; }
    } else {
      images = [product.imageUrl];
    }
  }

  const getOptionsPrice = () => {
    let total = 0;
    Object.values(selectedOptions).flat().forEach(opt => {
      total += opt.price;
    });
    return total;
  };

  const handleToggleOption = (group: any, option: any) => {
    const currentSelected = selectedOptions[group.id] || [];
    const isSelected = currentSelected.find(o => o.id === option.id);

    if (isSelected) {
      setSelectedOptions(prev => ({
        ...prev,
        [group.id]: prev[group.id].filter((o: any) => o.id !== option.id)
      }));
    } else {
      if (currentSelected.length >= group.maxChoices) {
        if (group.maxChoices === 1) {
          setSelectedOptions(prev => ({
            ...prev,
            [group.id]: [option]
          }));
        } else {
          useToastStore.getState().addToast(`Você pode escolher no máximo ${group.maxChoices} opções.`, 'error');
        }
      } else {
        setSelectedOptions(prev => ({
          ...prev,
          [group.id]: [...(prev[group.id] || []), option]
        }));
      }
    }
  };

  const handleAddToCart = () => {
    if (product.optionGroups) {
      for (const group of product.optionGroups) {
        const selected = selectedOptions[group.id] || [];
        if (group.required && selected.length < group.minChoices) {
          useToastStore.getState().addToast(`Por favor, selecione pelo menos ${group.minChoices} opção em: ${group.name}`, 'error');
          return;
        }
      }
    }

    const flatOptions = Object.values(selectedOptions).flat().map(o => ({
      name: o.name,
      price: o.price
    }));

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      options: flatOptions.length > 0 ? flatOptions : undefined,
    });
    
    if (onAdded) onAdded();
    onClose();
  };

  const unitPrice = product.price + getOptionsPrice();
  const totalPrice = unitPrice * quantity;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in pointer-events-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-[#f5f5f5] dark:bg-[#0a0a0a] w-full max-w-lg h-[90vh] sm:h-[85vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up sm:animate-fade-up">
        {/* Header / Images */}
        <div className="relative h-64 shrink-0 bg-black/10 dark:bg-white/10">
          {images.length > 0 ? (
            <>
              <img src={images[currentImageIdx]} alt={product.name} className="w-full h-full object-cover" />
              {images.length > 1 && (
                <>
                  <button 
                    onClick={() => setCurrentImageIdx(prev => prev === 0 ? images.length - 1 : prev - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={() => setCurrentImageIdx(prev => prev === images.length - 1 ? 0 : prev + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, idx) => (
                      <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIdx ? 'bg-white scale-125' : 'bg-white/50'}`} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-podium tracking-widest text-black/30 dark:text-white/30 uppercase">Sem foto</span>
            </div>
          )}
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 hide-scrollbar">
          <div>
            <h2 className="font-podium text-2xl uppercase tracking-widest text-black dark:text-white mb-2">{product.name}</h2>
            {product.description && (
              <p className="font-inter text-sm text-black/60 dark:text-white/60 leading-relaxed">{product.description}</p>
            )}
            <div className="mt-4 font-inter font-bold text-xl text-black dark:text-white tracking-widest">
              {(product.price / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>

          {product.optionGroups && product.optionGroups.length > 0 && (
            <div className="space-y-6 border-t border-black/10 dark:border-white/10 pt-6">
              {product.optionGroups.map((group: any) => {
                const selectedCount = (selectedOptions[group.id] || []).length;
                const isRequired = group.required && selectedCount < group.minChoices;

                return (
                  <div key={group.id} className="bg-white/50 dark:bg-black/50 rounded-2xl p-4 border border-black/5 dark:border-white/5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-podium uppercase tracking-widest text-black dark:text-white text-sm">{group.name}</h3>
                        <p className="font-inter text-[10px] text-black/50 dark:text-white/50 tracking-wider">
                          Escolha {group.minChoices === group.maxChoices ? group.maxChoices : `de ${group.minChoices} a ${group.maxChoices}`} opção(ões)
                        </p>
                      </div>
                      {isRequired ? (
                        <span className="bg-red-500/10 text-red-600 dark:text-red-400 text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-lg">Obrigatório</span>
                      ) : (
                        <span className="bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50 text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-lg">
                          {selectedCount}/{group.maxChoices}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {group.options.map((option: any) => {
                        const isSelected = (selectedOptions[group.id] || []).some((o: any) => o.id === option.id);
                        
                        return (
                          <label 
                            key={option.id} 
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-black dark:border-white bg-black/5 dark:bg-white/5' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'border-black dark:border-white bg-black dark:bg-white' : 'border-black/30 dark:border-white/30'}`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />}
                              </div>
                              <span className="font-inter text-sm text-black dark:text-white font-medium">{option.name}</span>
                            </div>
                            {option.price > 0 && (
                              <span className="font-inter text-xs text-black/60 dark:text-white/60 tracking-wider">
                                + {(option.price / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            )}
                            <input 
                              type="checkbox" 
                              className="hidden" 
                              checked={isSelected}
                              onChange={() => handleToggleOption(group, option)}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-black/10 dark:border-white/10 p-6 bg-white dark:bg-[#050505]">
          <div className="flex gap-4">
            <div className="flex items-center gap-4 bg-black/5 dark:bg-white/5 rounded-2xl px-2 border border-black/10 dark:border-white/10">
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="p-3 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
              >
                <Minus size={18} />
              </button>
              <span className="font-inter font-bold text-black dark:text-white min-w-[1.5rem] text-center">{quantity}</span>
              <button 
                onClick={() => setQuantity(q => q + 1)}
                className="p-3 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
            
            <button 
              onClick={handleAddToCart}
              className="flex-1 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 flex justify-between items-center text-sm px-6 py-4 transition-colors rounded-2xl"
            >
              <span className="font-inter tracking-[0.2em] font-semibold uppercase text-xs">Adicionar</span>
              <span className="font-inter font-bold tracking-widest text-sm">
                {(totalPrice / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
