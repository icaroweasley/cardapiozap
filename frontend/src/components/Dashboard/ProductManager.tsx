import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

interface ProductOption {
  id?: string;
  name: string;
  price: number;
}

interface ProductOptionGroup {
  id?: string;
  name: string;
  required: boolean;
  minChoices: number;
  maxChoices: number;
  options: ProductOption[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  available: boolean;
  optionGroups?: ProductOptionGroup[];
}

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    price: string;
    category: string;
    imageUrl: string;
    available: boolean;
    optionGroups: ProductOptionGroup[];
  }>({
    name: '',
    description: '',
    price: '',
    category: '',
    imageUrl: '',
    available: true,
    optionGroups: []
  });

  const addOptionGroup = () => {
    setFormData(prev => ({
      ...prev,
      optionGroups: [...prev.optionGroups, { name: '', required: false, minChoices: 0, maxChoices: 1, options: [] }]
    }));
  };

  const removeOptionGroup = (index: number) => {
    setFormData(prev => ({
      ...prev,
      optionGroups: prev.optionGroups.filter((_, i) => i !== index)
    }));
  };

  const updateOptionGroup = (index: number, field: keyof ProductOptionGroup, value: any) => {
    setFormData(prev => {
      const newGroups = [...prev.optionGroups];
      newGroups[index] = { ...newGroups[index], [field]: value };
      return { ...prev, optionGroups: newGroups };
    });
  };

  const addOption = (groupIndex: number) => {
    setFormData(prev => {
      const newGroups = [...prev.optionGroups];
      newGroups[groupIndex].options.push({ name: '', price: 0 });
      return { ...prev, optionGroups: newGroups };
    });
  };

  const removeOption = (groupIndex: number, optionIndex: number) => {
    setFormData(prev => {
      const newGroups = [...prev.optionGroups];
      newGroups[groupIndex].options = newGroups[groupIndex].options.filter((_, i) => i !== optionIndex);
      return { ...prev, optionGroups: newGroups };
    });
  };

  const updateOption = (groupIndex: number, optionIndex: number, field: keyof ProductOption, value: any) => {
    setFormData(prev => {
      const newGroups = [...prev.optionGroups];
      newGroups[groupIndex].options[optionIndex] = { ...newGroups[groupIndex].options[optionIndex], [field]: value };
      return { ...prev, optionGroups: newGroups };
    });
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setProducts(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        ...formData, 
        price: Math.round(parseFloat(formData.price) * 100),
        imageUrl: productImages.length > 0 ? JSON.stringify(productImages) : ''
      };
      if (editingId) {
        await axios.put(`/api/products/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post('/api/products', payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      setIsModalOpen(false);
      fetchProducts();
      useToastStore.getState().addToast('Produto salvo com sucesso!', 'success');
    } catch (error) {
      useToastStore.getState().addToast('Erro ao salvar produto', 'error');
    }
  };

  const handleEdit = (p: Product) => {
    let loadedImages: string[] = [];
    if (p.imageUrl) {
      if (p.imageUrl.startsWith('[')) {
        try { loadedImages = JSON.parse(p.imageUrl); } catch(e) { loadedImages = [p.imageUrl]; }
      } else {
        loadedImages = [p.imageUrl];
      }
    }
    setProductImages(loadedImages);
    setFormData({
      name: p.name,
      description: p.description,
      price: (p.price / 100).toString(),
      category: p.category,
      imageUrl: p.imageUrl || '',
      available: p.available,
      optionGroups: p.optionGroups || []
    });
    setEditingId(p.id);
    setIsModalOpen(true);
  };

  const [productImages, setProductImages] = useState<string[]>([]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    try {
      await axios.delete(`/api/products/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchProducts();
      useToastStore.getState().addToast('Produto excluído com sucesso.', 'success');
    } catch (error) {
      useToastStore.getState().addToast('Erro ao excluir', 'error');
    }
  };

  const openNewModal = () => {
    setFormData({ name: '', description: '', price: '', category: '', imageUrl: '', available: true, optionGroups: [] });
    setProductImages([]);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    if (productImages.length + files.length > 3) {
      useToastStore.getState().addToast('Máximo de 3 fotos por produto.', 'error');
      return;
    }

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        useToastStore.getState().addToast(`O arquivo ${file.name} excede o limite de 5MB.`, 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1024;
          let width = img.width; let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0, width, height);
          
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          setProductImages(prev => [...prev, compressed].slice(0, 3));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
    // Reset file input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setProductImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden animate-fade-up rounded-3xl lg:m-2">
      <div className="p-6 border-b border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/50 flex justify-between items-center">
        <h2 className="font-podium text-2xl uppercase tracking-widest text-black dark:text-white">Cardápio</h2>
        <button 
          onClick={openNewModal} 
          className="bg-black dark:bg-white text-white dark:text-black font-inter tracking-widest text-[10px] font-bold uppercase px-6 py-3 flex items-center gap-2 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors rounded-xl"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">NOVO PRODUTO</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="font-inter font-bold tracking-widest text-xs uppercase animate-pulse text-black/50 dark:text-white/50">Carregando Produtos...</p>
          </div>
        ) : (
          products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4 pt-10">
              <p className="font-podium text-xl uppercase tracking-widest text-black dark:text-white text-center">Nenhum produto cadastrado</p>
              <p className="font-inter text-xs tracking-widest uppercase text-black/50 dark:text-white/50 text-center max-w-md">Adicione produtos ao seu cardápio clicando no botão "Novo Produto" acima.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(
                products.reduce((acc, product) => {
                  if (!acc[product.category]) acc[product.category] = [];
                  acc[product.category].push(product);
                  return acc;
                }, {} as Record<string, Product[]>)
              ).map(([category, categoryProducts]) => (
                <div key={category}>
                  <h3 className="font-podium text-xl uppercase tracking-widest text-black dark:text-white mb-6 border-b border-black/10 dark:border-white/10 pb-3">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {categoryProducts.map(product => (
                      <div key={product.id} className={`flex flex-col bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-2xl border border-black/10 dark:border-white/10 shadow-xl transition-all ${!product.available ? 'opacity-50 grayscale' : ''} rounded-2xl overflow-hidden`}>
                        {product.imageUrl && (product.imageUrl.startsWith('[') ? (JSON.parse(product.imageUrl)[0]) : product.imageUrl) ? (
                          <div className="relative w-full h-40 group/img">
                            {(() => {
                              const imgUrl = product.imageUrl!;
                              let images = [imgUrl];
                              if (imgUrl.startsWith('[')) {
                                try { images = JSON.parse(imgUrl); } catch(e) {}
                              }
                              return (
                                <>
                                  <img src={images[0]} alt={product.name} className="w-full h-full object-cover border-b border-black/10 dark:border-white/10" />
                                  {images.length > 1 && (
                                    <div className="absolute inset-0 hidden group-hover/img:flex bg-black/50 backdrop-blur-sm flex-col items-center justify-center p-2 text-white">
                                      <span className="text-[10px] font-podium tracking-widest text-center">{images.length} FOTOS</span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="w-full h-40 bg-black/5 dark:bg-white/5 flex items-center justify-center border-b border-black/10 dark:border-white/10">
                            <span className="font-podium text-xs tracking-widest uppercase text-black/30 dark:text-white/30">NO IMAGE</span>
                          </div>
                        )}
                        
                        <div className="p-5 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-podium uppercase text-lg text-black dark:text-white tracking-wider truncate mr-2">{product.name}</h3>
                            <span className="bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/10 text-black dark:text-white px-2 py-1 text-[9px] font-inter font-bold tracking-widest uppercase shrink-0 rounded-lg">
                              {product.category}
                            </span>
                          </div>
                          
                          <p className="font-inter font-bold text-base text-black dark:text-white tracking-widest mb-6">
                            {(product.price / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                          
                          <div className="flex gap-2 mt-auto">
                            <button 
                              onClick={() => handleEdit(product)} 
                              className="flex-1 border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 py-3 text-[10px] font-inter font-bold tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-black dark:text-white rounded-xl"
                            >
                              <Edit size={14}/> EDITAR
                            </button>
                            <button 
                              onClick={() => handleDelete(product.id)} 
                              className="flex-1 border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 py-3 text-[10px] font-inter font-bold tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors rounded-xl"
                            >
                              <Trash2 size={14}/> EXCLUIR
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-100 dark:bg-[#050505] w-full max-w-lg p-8 border border-black/10 dark:border-white/10 shadow-2xl relative rounded-3xl overflow-y-auto max-h-[90vh] hide-scrollbar">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors">
              <X size={20} />
            </button>
            
            <h2 className="font-podium text-2xl uppercase tracking-widest text-black dark:text-white mb-8">
              {editingId ? 'EDITAR PRODUTO' : 'NOVO PRODUTO'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block font-inter text-[10px] tracking-widest text-black/50 dark:text-white/50 uppercase mb-2">Nome</label>
                <input 
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-black dark:text-white p-3 font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-xl" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block font-inter text-[10px] tracking-widest text-black/50 dark:text-white/50 uppercase mb-2">Preço (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-black dark:text-white p-3 font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-xl" 
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: e.target.value})} 
                    required 
                  />
                </div>
                <div>
                  <label className="block font-inter text-[10px] tracking-widest text-black/50 dark:text-white/50 uppercase mb-2">Categoria</label>
                  <input 
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-black dark:text-white p-3 font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-xl" 
                    placeholder="Ex: Bebidas" 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="block font-inter text-[10px] tracking-widest text-black/50 dark:text-white/50 uppercase mb-2">Imagens (Até 3 fotos, Max 5MB cada)</label>
                <div className="flex items-center gap-3">
                  {productImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 group">
                      <img src={img} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => removeImage(idx)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {productImages.length < 3 && (
                    <label className="w-16 h-16 rounded-xl border border-dashed border-black/30 dark:border-white/30 flex items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <Plus size={20} className="text-black/50 dark:text-white/50" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        className="hidden" 
                        onChange={handleImageUpload} 
                      />
                    </label>
                  )}
                </div>
              </div>
              <div>
                <label className="block font-inter text-[10px] tracking-widest text-black/50 dark:text-white/50 uppercase mb-2">Descrição</label>
                <textarea 
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-black dark:text-white p-3 font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-xl" 
                  rows={2} 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>

              {/* OPCIONAIS E COMPLEMENTOS */}
              <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-podium text-lg uppercase tracking-widest text-black dark:text-white">Opcionais e Complementos</h3>
                  <button 
                    type="button" 
                    onClick={addOptionGroup}
                    className="bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white text-[10px] font-inter font-bold tracking-widest uppercase px-3 py-2 rounded-lg flex items-center gap-1 transition-colors border border-black/10 dark:border-white/10"
                  >
                    <Plus size={12} /> GRUPO
                  </button>
                </div>

                {formData.optionGroups.map((group, gIdx) => (
                  <div key={gIdx} className="bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 p-4 rounded-2xl relative space-y-4">
                    <button 
                      type="button" 
                      onClick={() => removeOptionGroup(gIdx)}
                      className="absolute top-4 right-4 text-red-500 hover:text-red-600 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    <div>
                      <label className="block font-inter text-[10px] tracking-widest text-black/50 dark:text-white/50 uppercase mb-1">Nome do Grupo (Ex: Adicionais, Ponto da Carne)</label>
                      <input 
                        className="w-full bg-transparent border-b border-black/20 dark:border-white/20 text-black dark:text-white py-2 font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors" 
                        value={group.name} 
                        onChange={e => updateOptionGroup(gIdx, 'name', e.target.value)} 
                        required 
                      />
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={group.required}
                          onChange={e => updateOptionGroup(gIdx, 'required', e.target.checked)}
                          className="w-4 h-4 accent-black dark:accent-white"
                        />
                        <span className="font-inter text-[10px] font-bold tracking-widest text-black/70 dark:text-white/70 uppercase">Obrigatório</span>
                      </label>
                      
                      <div className="flex items-center gap-2">
                        <label className="font-inter text-[10px] font-bold tracking-widest text-black/70 dark:text-white/70 uppercase">Mín:</label>
                        <input type="number" min="0" value={group.minChoices} onChange={e => updateOptionGroup(gIdx, 'minChoices', parseInt(e.target.value) || 0)} className="w-12 bg-transparent border-b border-black/20 dark:border-white/20 text-black dark:text-white text-center text-sm focus:outline-none" />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="font-inter text-[10px] font-bold tracking-widest text-black/70 dark:text-white/70 uppercase">Máx:</label>
                        <input type="number" min="1" value={group.maxChoices} onChange={e => updateOptionGroup(gIdx, 'maxChoices', parseInt(e.target.value) || 1)} className="w-12 bg-transparent border-b border-black/20 dark:border-white/20 text-black dark:text-white text-center text-sm focus:outline-none" />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      {group.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <input 
                            placeholder="Nome da opção"
                            className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white px-3 py-2 text-xs rounded-lg focus:outline-none"
                            value={opt.name}
                            onChange={e => updateOption(gIdx, oIdx, 'name', e.target.value)}
                            required
                          />
                          <div className="relative w-24">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-black/50 dark:text-white/50">R$</span>
                            <input 
                              type="number" step="0.01" min="0"
                              placeholder="0,00"
                              className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white pl-8 pr-2 py-2 text-xs rounded-lg focus:outline-none"
                              value={opt.price ? (opt.price / 100).toString() : ''}
                              onChange={e => updateOption(gIdx, oIdx, 'price', Math.round(parseFloat(e.target.value || '0') * 100))}
                            />
                          </div>
                          <button type="button" onClick={() => removeOption(gIdx, oIdx)} className="p-2 text-black/30 dark:text-white/30 hover:text-red-500">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button 
                        type="button" 
                        onClick={() => addOption(gIdx)}
                        className="text-[10px] font-inter font-bold tracking-widest uppercase text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white flex items-center gap-1 pt-2 transition-colors"
                      >
                        <Plus size={12} /> Adicionar Opção
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="available" 
                  checked={formData.available} 
                  onChange={e => setFormData({...formData, available: e.target.checked})} 
                  className="w-4 h-4 accent-black dark:accent-white" 
                />
                <label htmlFor="available" className="font-inter text-xs font-bold tracking-widest uppercase text-black dark:text-white">
                  Disponível para Venda
                </label>
              </div>
              
              <div className="flex gap-4 pt-6 border-t border-black/10 dark:border-white/10 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 border border-black/20 dark:border-white/20 text-black dark:text-white font-inter tracking-widest text-[10px] uppercase py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-bold rounded-xl"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-black dark:bg-white text-white dark:text-black font-inter tracking-widest text-[10px] uppercase py-4 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors font-bold rounded-xl"
                >
                  SALVAR PRODUTO
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
