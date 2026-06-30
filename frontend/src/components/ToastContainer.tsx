import { useToastStore } from '../store/useToastStore';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`pointer-events-auto flex items-center justify-between p-4 rounded-2xl shadow-2xl animate-fade-in min-w-[280px] max-w-[400px] border backdrop-blur-md font-inter tracking-wider text-xs uppercase font-bold transition-all
            ${toast.type === 'error' ? 'bg-red-500/95 text-white border-red-400/50' : 
              toast.type === 'success' ? 'bg-emerald-500/95 text-white border-emerald-400/50' : 
              'bg-neutral-800/95 dark:bg-neutral-200/95 text-white dark:text-black border-black/20 dark:border-white/20'}`}
        >
          <div className="flex items-center gap-3">
            {toast.type === 'error' && <AlertCircle size={18} className="shrink-0" />}
            {toast.type === 'success' && <CheckCircle size={18} className="shrink-0" />}
            {toast.type === 'info' && <Info size={18} className="shrink-0" />}
            <span className="leading-relaxed">{toast.message}</span>
          </div>
          <button onClick={() => removeToast(toast.id)} className="ml-4 p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
