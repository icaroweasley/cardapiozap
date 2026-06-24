import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Package, Activity, Moon, Sun, Crown, Settings2 } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import KanbanBoard from '../components/Dashboard/KanbanBoard';
import ProductManager from '../components/Dashboard/ProductManager';
import SettingsPanel from '../components/Dashboard/SettingsPanel';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'KANBAN' | 'PRODUCTS' | 'SETTINGS'>('KANBAN');
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useThemeStore();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('merchant');
    navigate('/login');
  };

  const merchant = JSON.parse(localStorage.getItem('merchant') || '{}');

  return (
    <div className="h-screen overflow-hidden flex flex-col md:flex-row bg-neutral-100 dark:bg-black transition-colors duration-500 relative">
      {/* Background Image */}
      <img
        src="/bg-burger.png"
        alt="Background"
        className="fixed inset-0 w-full h-full object-cover opacity-10 dark:opacity-20 pointer-events-none transition-opacity duration-500"
      />

      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-2 bg-white/80 dark:bg-black/80 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-full shadow-xl hover:scale-110 transition-all md:top-6 md:right-6"
      >
        {isDark ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-black" />}
      </button>

      {/* Sidebar */}
      <aside className="w-full md:w-[300px] shrink-0 border-b md:border-b-0 md:border-r border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-md relative z-20 flex flex-col md:h-screen transition-colors duration-500">
        <div className="p-8 border-b border-black/10 dark:border-white/10 flex flex-col items-start">
          <Crown className="w-8 h-8 text-black/30 dark:text-white/30 mb-4" />
          <h1 className="font-podium text-2xl uppercase tracking-widest text-black dark:text-white">{merchant.name || 'LOJA'}</h1>
          <p className="font-inter text-black/60 dark:text-white/60 text-[10px] tracking-[0.2em] uppercase mt-2 flex items-center gap-2 font-bold">
            <Activity size={12} className="text-green-500" /> SISTEMA ONLINE
          </p>
        </div>
        
        <nav className="flex-1 p-6 flex flex-row md:flex-col gap-4 overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setActiveTab('KANBAN')}
            className={`flex items-center gap-4 px-6 py-4 font-inter text-xs tracking-widest uppercase transition-all whitespace-nowrap border ${activeTab === 'KANBAN' ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white font-bold shadow-lg' : 'bg-white/10 dark:bg-black/10 text-black/70 dark:text-white/70 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <LayoutDashboard size={18} />
            Pedidos
          </button>
          <button 
            onClick={() => setActiveTab('PRODUCTS')}
            className={`flex items-center gap-4 px-6 py-4 font-inter text-xs tracking-widest uppercase transition-all whitespace-nowrap border ${activeTab === 'PRODUCTS' ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white font-bold shadow-lg' : 'bg-white/10 dark:bg-black/10 text-black/70 dark:text-white/70 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <Package size={18} />
            Cardápio
          </button>
          <button 
            onClick={() => setActiveTab('SETTINGS')}
            className={`flex items-center gap-4 px-6 py-4 font-inter text-xs tracking-widest uppercase transition-all whitespace-nowrap border ${activeTab === 'SETTINGS' ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white font-bold shadow-lg' : 'bg-white/10 dark:bg-black/10 text-black/70 dark:text-white/70 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <Settings2 size={18} />
            Conexões
          </button>
        </nav>

        <div className="p-6 mt-auto border-t border-black/10 dark:border-white/10">
          <button onClick={handleLogout} className="flex items-center gap-4 px-6 py-4 font-inter text-xs tracking-widest uppercase text-red-600 dark:text-red-400 border border-red-600/20 dark:border-red-400/20 hover:bg-red-600/10 dark:hover:bg-red-400/10 w-full transition-colors bg-white/10 dark:bg-black/10 backdrop-blur-sm font-bold">
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative z-10 overflow-hidden flex flex-col p-4 md:p-8">
        {activeTab === 'KANBAN' && <KanbanBoard />}
        {activeTab === 'PRODUCTS' && <ProductManager />}
        {activeTab === 'SETTINGS' && <SettingsPanel />}
      </main>
    </div>
  );
}
