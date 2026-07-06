import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, LayoutDashboard, Package, Activity, Moon, Sun, Settings2, Megaphone, Server, AlertTriangle, X, QrCode, TrendingUp, Menu } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { useToastStore } from '../store/useToastStore';
import { io } from 'socket.io-client';
import { playNotificationSound } from '../utils/audioAlerts';
import KanbanBoard from '../components/Dashboard/KanbanBoard';
import ProductManager from '../components/Dashboard/ProductManager';
import SettingsPanel from '../components/Dashboard/SettingsPanel';
import BroadcastManager from '../components/Dashboard/BroadcastManager';
import AdminPanel from '../components/Dashboard/AdminPanel';
import ProfilePanel from '../components/Dashboard/ProfilePanel';
import QRCodeManager from '../components/Dashboard/QRCodeManager';
import ReportsPanel from '../components/Dashboard/ReportsPanel';

export default function Dashboard() {
  const merchant = JSON.parse(localStorage.getItem('merchant') || '{}');
  const [activeTab, setActiveTab] = useState<'KANBAN' | 'PRODUCTS' | 'SETTINGS' | 'BROADCAST' | 'ADMIN' | 'PROFILE' | 'QRCODE' | 'REPORTS'>(
    (localStorage.getItem('dashboard_tab') as any) || (merchant.accountType === 'BROADCAST_ONLY' ? 'BROADCAST' : 'KANBAN')
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('dashboard_tab', activeTab);
    setIsMobileMenuOpen(false); // Close mobile menu on tab change
  }, [activeTab]);
  const navigate = useNavigate();
  const { isDark, toggleTheme, previewBackground } = useThemeStore();

  const themeConfig = previewBackground || merchant.themeConfig;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('merchant');
    localStorage.removeItem('dashboard_tab');
    navigate('/login');
  };



  const [showGraceModal, setShowGraceModal] = useState(false);
  const [graceDaysLeft, setGraceDaysLeft] = useState(0);
  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);

  const handleRenewPlan = async () => {
    try {
      setIsGeneratingPayment(true);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await axios.post(`${apiUrl}/api/payment/checkout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.init_point) {
        window.location.href = res.data.init_point;
      }
    } catch (error) {
      console.error(error);
      useToastStore.getState().addToast('Erro ao gerar link de pagamento. Tente novamente mais tarde.', 'error');
      setIsGeneratingPayment(false);
    }
  };

  let isTotalBlock = false;
  if (!merchant.isAdmin) {
    if (merchant.planStatus === 'inactive') {
      isTotalBlock = true;
    } else if (merchant.planExpiresAt) {
      const expiresAt = new Date(merchant.planExpiresAt).getTime();
      const now = new Date().getTime();
      
      if (merchant.isTrial) {
        if (now > expiresAt) {
          isTotalBlock = true;
        }
      } else {
        const gracePeriodEnd = expiresAt + (3 * 24 * 60 * 60 * 1000);
        if (now > gracePeriodEnd) {
          isTotalBlock = true;
        }
      }
    }
  }

  useEffect(() => {
    if (merchant.planExpiresAt && merchant.planStatus === 'active' && !merchant.isAdmin && !isTotalBlock) {
      const expiresAt = new Date(merchant.planExpiresAt).getTime();
      const now = new Date().getTime();
      
      if (!merchant.isTrial) {
        const gracePeriodEnd = expiresAt + (3 * 24 * 60 * 60 * 1000);
        
        if (now >= expiresAt && now <= gracePeriodEnd) {
        const msPassed = now - expiresAt;
        const daysPassed = Math.floor(msPassed / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(0, 3 - daysPassed);
        setGraceDaysLeft(daysLeft);
        setShowGraceModal(true);
        }
      }
    }
  }, [merchant.planExpiresAt, merchant.planStatus, merchant.isAdmin, isTotalBlock, merchant.isTrial]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || isTotalBlock) return;

    const socket = io(import.meta.env.VITE_API_URL || '', {
      auth: { token }
    });

    socket.on('new-order', (order) => {
      try {
        const merchantData = JSON.parse(localStorage.getItem('merchant') || '{}');
        const theme = typeof merchantData.themeConfig === 'string' ? JSON.parse(merchantData.themeConfig) : (merchantData.themeConfig || {});
        const soundType = theme.notificationSound || 'cash_register';
        playNotificationSound(soundType);
        
        useToastStore.getState().addToast(`Novo pedido recebido: ${order.customerName}`, 'success');
      } catch (e) {
        console.error('Erro ao tocar som', e);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isTotalBlock]);

  if (isTotalBlock) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-100 dark:bg-black transition-colors duration-500 relative font-inter">
        {themeConfig?.backgroundType === 'custom' && themeConfig?.backgroundValue ? (
          <img
            src={themeConfig.backgroundValue}
            alt="Custom Background"
            className="fixed inset-0 w-full h-full object-cover opacity-10 dark:opacity-20 pointer-events-none transition-opacity duration-500 animate-slow-pan"
          />
        ) : themeConfig?.backgroundType === 'preset' && themeConfig?.backgroundValue?.startsWith('img:') ? (
          <img
            src={themeConfig.backgroundValue.replace('img:', '')}
            alt="Background"
            className="fixed inset-0 w-full h-full object-cover opacity-10 dark:opacity-20 pointer-events-none transition-opacity duration-500 animate-slow-pan"
          />
        ) : themeConfig?.backgroundType === 'preset' && themeConfig?.backgroundValue ? (
          <div 
            className={`fixed inset-0 w-full h-full opacity-10 dark:opacity-20 pointer-events-none transition-opacity duration-500 ${themeConfig.backgroundValue}`}
          />
        ) : (
          <img
            src="/bg-burger.png"
            alt="Background"
            className="fixed inset-0 w-full h-full object-cover opacity-10 dark:opacity-20 pointer-events-none transition-opacity duration-500 animate-slow-pan"
          />
        )}
        <div className="bg-white/40 dark:bg-black/40 backdrop-blur-3xl border border-black/10 dark:border-white/10 p-10 rounded-[2rem] shadow-2xl flex flex-col items-center text-center max-w-md z-10 animate-fade-up">
          <img src="/logo-transparent.png" alt="ZapGarçom Logo" className="h-28 w-auto mb-6 drop-shadow-[0_0_15px_rgba(74,222,128,0.3)] animate-pulse-slow" />
          <h1 className="font-podium text-2xl uppercase tracking-widest text-black dark:text-white mb-4">
            {merchant.isTrial ? 'Período de Teste Encerrado' : 'Assinatura Inativa'}
          </h1>
          <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed mb-8">
            {merchant.isTrial 
              ? 'Seu período de teste gratuito acabou. Para continuar recebendo pedidos e realizando disparos, por favor assine o plano mensal.'
              : 'O plano do seu estabelecimento expirou. Para voltar a receber pedidos e realizar disparos, por favor renove a sua assinatura.'}
          </p>
          <button 
            onClick={handleRenewPlan}
            disabled={isGeneratingPayment}
            className="w-full bg-black dark:bg-white text-white dark:text-black font-bold text-sm py-4 rounded-xl flex items-center justify-center hover:scale-105 transition-transform shadow-xl uppercase tracking-widest disabled:opacity-50 disabled:hover:scale-100"
          >
            {isGeneratingPayment ? 'Gerando Link...' : 'Renovar Plano'}
          </button>
          <button onClick={handleLogout} className="mt-6 text-[10px] text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white uppercase tracking-widest font-bold flex items-center gap-2">
            <LogOut size={12} /> Sair da conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col md:flex-row bg-neutral-100 dark:bg-black transition-colors duration-500 relative">
      {/* Background Image */}
      {themeConfig?.backgroundType === 'custom' && themeConfig?.backgroundValue ? (
        <img
          src={themeConfig.backgroundValue}
          alt="Custom Background"
          className="fixed inset-0 w-full h-full object-cover opacity-10 dark:opacity-20 pointer-events-none transition-opacity duration-500 animate-slow-pan"
        />
      ) : themeConfig?.backgroundType === 'preset' && themeConfig?.backgroundValue?.startsWith('img:') ? (
        <img
          src={themeConfig.backgroundValue.replace('img:', '')}
          alt="Background"
          className="fixed inset-0 w-full h-full object-cover opacity-10 dark:opacity-20 pointer-events-none transition-opacity duration-500 animate-slow-pan"
        />
      ) : themeConfig?.backgroundType === 'preset' && themeConfig?.backgroundValue ? (
        <div 
          className={`fixed inset-0 w-full h-full opacity-10 dark:opacity-20 pointer-events-none transition-opacity duration-500 ${themeConfig.backgroundValue}`}
        />
      ) : (
        <img
          src="/bg-burger.png"
          alt="Background"
          className="fixed inset-0 w-full h-full object-cover opacity-10 dark:opacity-20 pointer-events-none transition-opacity duration-500 animate-slow-pan"
        />
      )}

      {/* Theme Toggle (Desktop Only) */}
      <button 
        onClick={toggleTheme}
        className="hidden md:flex fixed top-6 right-6 z-50 p-3 bg-white/80 dark:bg-black/80 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-full shadow-xl hover:scale-110 transition-all"
      >
        {isDark ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-black" />}
      </button>

      {/* Grace Period Modal */}
      {showGraceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-inter">
          <div className="bg-white dark:bg-[#121215] border border-red-500/30 p-8 rounded-3xl shadow-2xl max-w-md w-full relative animate-fade-up">
            <button onClick={() => setShowGraceModal(false)} className="absolute top-4 right-4 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors">
              <X size={20} />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-2xl font-bold text-red-500 uppercase tracking-widest mb-4 font-podium">
                Atenção
              </h2>
              <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed mb-4">
                A assinatura do seu plano terminou. Você tem
              </p>
              <div className="text-red-500 mb-4 inline-block">
                <span className="text-4xl font-podium font-bold tracking-widest">{graceDaysLeft}</span>
                <span className="text-sm font-bold ml-2 uppercase tracking-widest block mt-1">
                  {graceDaysLeft === 1 ? 'dia restante' : 'dias restantes'}
                </span>
              </div>
              <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed mb-8">
                para renová-la ou seu acesso será bloqueado.
              </p>
              <button 
                onClick={handleRenewPlan}
                disabled={isGeneratingPayment}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold text-xs py-4 rounded-xl uppercase tracking-widest transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50"
              >
                {isGeneratingPayment ? 'Gerando Link...' : 'Renovar Agora'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Top Bar */}
      <div className="md:hidden w-full bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-black/10 dark:border-white/10 px-4 py-3 flex items-center justify-between relative z-40">
        <div className="flex items-center gap-3 min-w-0">
          {merchant.logoUrl ? (
            <img src={merchant.logoUrl} alt="Logo" className="w-10 h-10 rounded-full object-cover shadow-sm" />
          ) : (
            <img src="/logo-transparent.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" />
          )}
          <span className="font-podium font-bold uppercase tracking-widest text-black dark:text-white truncate">
            {merchant.name || 'LOJA'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="p-3 text-black dark:text-white bg-black/5 dark:bg-white/5 rounded-xl min-w-[48px] min-h-[48px] flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-black dark:text-white bg-black/5 dark:bg-white/5 rounded-xl min-w-[48px] min-h-[48px] flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[280px] md:w-[300px] shrink-0 border-r border-black/10 dark:border-white/10 bg-white/95 dark:bg-black/95 md:bg-white/60 md:dark:bg-black/40 md:backdrop-blur-md flex flex-col h-[100dvh] transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="p-6 md:p-8 border-b border-black/10 dark:border-white/10 flex flex-col items-start relative">
          {merchant.logoUrl ? (
            <img src={merchant.logoUrl} alt="Logo da Loja" className="h-16 w-16 object-cover rounded-full mb-4 shadow-lg ring-2 ring-black/10 dark:ring-white/10" />
          ) : (
            <img src="/logo-transparent.png" alt="ZapGarçom Logo" className="h-16 w-auto mb-4 drop-shadow-[0_0_10px_rgba(74,222,128,0.3)] animate-pulse-slow" />
          )}
          <h1 className="font-podium text-lg sm:text-xl font-bold uppercase tracking-widest text-black dark:text-white w-full break-words leading-tight" title={merchant.name || 'LOJA'}>{merchant.name || 'LOJA'}</h1>
          <p className="font-inter text-black/60 dark:text-white/60 text-[10px] tracking-[0.2em] uppercase mt-2 flex items-center gap-2 font-bold">
            <Activity size={12} className="text-green-500" /> SISTEMA ONLINE
          </p>
        </div>
        
        <nav className="flex-1 p-4 md:p-6 flex flex-col gap-2 md:gap-4 overflow-y-auto custom-scrollbar">
          {merchant.accountType !== 'BROADCAST_ONLY' && (
            <>
              <button 
                onClick={() => setActiveTab('KANBAN')}
                className={`flex items-center gap-4 px-6 min-h-[48px] md:py-4 font-inter text-xs tracking-widest uppercase transition-all whitespace-nowrap border rounded-xl ${activeTab === 'KANBAN' ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white font-bold shadow-lg' : 'bg-white/10 dark:bg-black/10 text-black/70 dark:text-white/70 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <LayoutDashboard size={18} />
                Pedidos
              </button>
              <button 
                onClick={() => setActiveTab('PRODUCTS')}
                className={`flex items-center gap-4 px-6 min-h-[48px] md:py-4 font-inter text-xs tracking-widest uppercase transition-all whitespace-nowrap border rounded-xl ${activeTab === 'PRODUCTS' ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white font-bold shadow-lg' : 'bg-white/10 dark:bg-black/10 text-black/70 dark:text-white/70 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <Package size={18} />
                Cardápio
              </button>
              <button 
                onClick={() => setActiveTab('REPORTS')}
                className={`flex items-center gap-4 px-6 min-h-[48px] md:py-4 font-inter text-xs tracking-widest uppercase transition-all whitespace-nowrap border rounded-xl ${activeTab === 'REPORTS' ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white font-bold shadow-lg' : 'bg-white/10 dark:bg-black/10 text-black/70 dark:text-white/70 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <TrendingUp size={18} />
                Relatórios
              </button>
              <button 
                onClick={() => setActiveTab('QRCODE')}
                className={`flex items-center gap-4 px-6 min-h-[48px] md:py-4 font-inter text-xs tracking-widest uppercase transition-all whitespace-nowrap border rounded-xl ${activeTab === 'QRCODE' ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white font-bold shadow-lg' : 'bg-white/10 dark:bg-black/10 text-black/70 dark:text-white/70 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <QrCode size={18} />
                Mesas (QR)
              </button>
            </>
          )}
          <button 
            onClick={() => setActiveTab('SETTINGS')}
            className={`flex items-center gap-4 px-6 min-h-[48px] md:py-4 font-inter text-xs tracking-widest uppercase transition-all whitespace-nowrap border rounded-xl ${activeTab === 'SETTINGS' ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white font-bold shadow-lg' : 'bg-white/10 dark:bg-black/10 text-black/70 dark:text-white/70 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <Settings2 size={18} />
            Conexões
          </button>
          <button 
            onClick={() => setActiveTab('BROADCAST')}
            className={`flex items-center gap-4 px-6 min-h-[48px] md:py-4 font-inter text-xs tracking-widest uppercase transition-all whitespace-nowrap border rounded-xl ${activeTab === 'BROADCAST' ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white font-bold shadow-lg' : 'bg-white/10 dark:bg-black/10 text-black/70 dark:text-white/70 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <Megaphone size={18} />
            Disparos
          </button>
          <button 
            onClick={() => setActiveTab('PROFILE')}
            className={`flex items-center gap-4 px-6 min-h-[48px] md:py-4 font-inter text-xs tracking-widest uppercase transition-all whitespace-nowrap border rounded-xl ${activeTab === 'PROFILE' ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white font-bold shadow-lg' : 'bg-white/10 dark:bg-black/10 text-black/70 dark:text-white/70 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <Settings2 size={18} />
            Perfil da Loja
          </button>
          
          {merchant.isAdmin && (
            <button 
              onClick={() => setActiveTab('ADMIN')}
              className={`flex items-center gap-4 px-6 min-h-[48px] md:py-4 font-inter text-xs tracking-widest uppercase transition-all whitespace-nowrap border rounded-xl ${activeTab === 'ADMIN' ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white font-bold shadow-lg' : 'bg-white/10 dark:bg-black/10 text-black/70 dark:text-white/70 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <Server size={18} />
              Painel Admin
            </button>
          )}
        </nav>

        <div className="p-4 md:p-6 mt-auto border-t border-black/10 dark:border-white/10">
          <button onClick={handleLogout} className="flex items-center justify-center gap-4 px-6 min-h-[48px] md:py-4 font-inter text-xs tracking-widest uppercase text-red-600 dark:text-red-400 border border-red-600/20 dark:border-red-400/20 hover:bg-red-600/10 dark:hover:bg-red-400/10 w-full transition-colors bg-white/10 dark:bg-black/10 backdrop-blur-sm font-bold rounded-xl">
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
        {activeTab === 'BROADCAST' && <BroadcastManager setActiveTab={setActiveTab} />}
        {activeTab === 'ADMIN' && <AdminPanel />}
        {activeTab === 'PROFILE' && <ProfilePanel />}
        {activeTab === 'QRCODE' && <QRCodeManager />}
        {activeTab === 'REPORTS' && <ReportsPanel />}
      </main>
    </div>
  );
}
