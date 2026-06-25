import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Crown, ArrowRight, Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

export default function Login() {
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useThemeStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/login', { slug, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('merchant', JSON.stringify(res.data.merchant));
      navigate('/dashboard');
    } catch (err) {
      setError('Credenciais inválidas. Verifique o slug e a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-neutral-100 dark:bg-black transition-colors duration-500 flex flex-col items-center justify-center p-4">
      {/* Background Image */}
      <img
        src="/bg-burger.png"
        alt="Background"
        className="fixed inset-0 w-full h-full object-cover opacity-10 dark:opacity-20 pointer-events-none animate-slow-pan transition-opacity duration-500"
      />

      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        className="fixed top-6 right-6 lg:top-10 lg:right-10 z-50 p-3 bg-white/80 dark:bg-black/80 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-full shadow-xl hover:scale-110 transition-all group"
      >
        {isDark ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-black" />}
      </button>

      <div className="relative z-10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl p-10 max-w-md w-full border border-black/10 dark:border-white/10 shadow-2xl animate-fade-up rounded-3xl">
        <div className="flex justify-center mb-8">
          <Crown size={48} className="text-black dark:text-white" />
        </div>
        <p className="font-inter text-[10px] tracking-widest text-black/50 dark:text-white/50 text-center uppercase mb-8">
          Acesso Restrito
        </p>
        
        {error && <p className="font-inter text-xs text-red-500 mb-6 uppercase tracking-widest text-center border border-red-500/20 bg-red-500/10 p-3 rounded-xl">{error}</p>}
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block font-inter text-[10px] tracking-widest text-black/70 dark:text-white/70 uppercase mb-3 font-bold">URL da Loja</label>
            <input 
              className="w-full bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 text-black dark:text-white p-4 font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-xl" 
              placeholder="lanchonete-demo" 
              value={slug} 
              onChange={e => setSlug(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block font-inter text-[10px] tracking-widest text-black/70 dark:text-white/70 uppercase mb-3 font-bold">Senha de Acesso</label>
            <input 
              type="password"
              className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-black dark:text-white p-4 font-inter focus:outline-none focus:border-black dark:focus:border-white transition-colors placeholder:text-black/30 dark:placeholder:text-white/30 rounded-xl" 
              placeholder="******" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-black dark:bg-white text-white dark:text-black font-inter tracking-[0.2em] font-semibold text-[11px] uppercase py-5 mt-4 flex items-center justify-center gap-3 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors group rounded-xl"
            disabled={loading}
          >
            {loading ? 'AUTENTICANDO...' : 'ACESSAR PAINEL'}
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>
      </div>
    </div>
  );
}
