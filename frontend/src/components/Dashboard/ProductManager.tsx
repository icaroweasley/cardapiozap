import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Plus, Edit, Trash2, X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  available: boolean;
}

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageUrl: '',
    available: true
  });

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
      const payload = { ...formData, price: Math.round(parseFloat(formData.price) * 100) };
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
    } catch (error) {
      alert('Erro ao salvar produto');
    }
  };

  const handleEdit = (p: Product) => {
    setFormData({
      name: p.name,
      description: p.description,
      price: (p.price / 100).toString(),
      category: p.category,
      imageUrl: p.imageUrl || '',
      available: p.available
    });
    setEditingId(p.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    try {
      await axios.delete(`/api/products/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchProducts();
    } catch (error) {
      alert('Erro ao excluir');
    }
  };

  const openNewModal = () => {
    setFormData({ name: '', description: '', price: '', category: '', imageUrl: '', available: true });
    setEditingId(null);
    setIsModalOpen(true);
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
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-40 object-cover border-b border-black/10 dark:border-white/10" />
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
        )}
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-100 dark:bg-[#050505] w-full max-w-lg p-8 border border-black/10 dark:border-white/10 shadow-2xl relative rounded-3xl overflow-hidden">
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
                <label className="block font-inter text-[10px] tracking-widest text-black/50 dark:text-white/50 uppercase mb-2">URL da Imagem</label>
                <input 
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-black dark:text-white p-3 font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-xl" 
                  value={formData.imageUrl} 
                  onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
                />
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
