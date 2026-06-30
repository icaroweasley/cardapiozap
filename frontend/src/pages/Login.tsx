import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useThemeStore();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegistering) {
        const res = await axios.post('/api/auth/register', { name, slug, phone, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('merchant', JSON.stringify(res.data.merchant));
        navigate('/dashboard');
      } else {
        const res = await axios.post('/api/auth/login', { slug, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('merchant', JSON.stringify(res.data.merchant));
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (isRegistering) {
        setError(err.response?.data?.error || 'Erro ao criar conta. Tente outro slug.');
      } else {
        setError('Credenciais inválidas. Verifique o slug e a senha.');
      }
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
        <div className="flex justify-center mb-4">
          <img src="/logo-transparent.png" alt="ZapGarçom Logo" className="h-32 w-auto drop-shadow-[0_0_15px_rgba(74,222,128,0.3)] animate-pulse-slow" />
        </div>
        <h1 className="font-podium text-2xl uppercase tracking-widest text-black dark:text-white text-center mb-2">ZapGarçom</h1>
        <p className="font-inter text-[10px] tracking-widest text-black/50 dark:text-white/50 text-center uppercase mb-8">
          {isRegistering ? 'Crie sua conta (Teste Grátis 3 dias)' : 'Acesso Restrito'}
        </p>
        
        {error && <p className="font-inter text-xs text-red-500 mb-6 uppercase tracking-widest text-center border border-red-500/20 bg-red-500/10 p-3 rounded-xl">{error}</p>}
        
        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <>
              <div>
                <label className="block font-inter text-[10px] tracking-widest text-black/70 dark:text-white/70 uppercase mb-2 font-bold">Nome da Loja</label>
                <input 
                  className="w-full bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 text-black dark:text-white p-3 font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-xl" 
                  placeholder="Lanchonete do Zé" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label className="block font-inter text-[10px] tracking-widest text-black/70 dark:text-white/70 uppercase mb-2 font-bold">Telefone (WhatsApp)</label>
                <input 
                  className="w-full bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 text-black dark:text-white p-3 font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-xl" 
                  placeholder="5511999999999" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  required 
                />
              </div>
            </>
          )}
          
          <div>
            <label className="block font-inter text-[10px] tracking-widest text-black/70 dark:text-white/70 uppercase mb-2 font-bold">URL da Loja {isRegistering && '(Sem espaços)'}</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-black/40 dark:text-white/40 text-xs font-bold">zapgarcom.com.br/</span>
              <input 
                className="w-full bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 text-black dark:text-white p-3 pl-[140px] font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-xl" 
                placeholder="lanchonete-ze" 
                value={slug} 
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} 
                required 
              />
            </div>
          </div>
          <div>
            <label className="block font-inter text-[10px] tracking-widest text-black/70 dark:text-white/70 uppercase mb-2 font-bold">Senha de Acesso</label>
            <input 
              type="password"
              className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-black dark:text-white p-3 font-inter focus:outline-none focus:border-black dark:focus:border-white transition-colors placeholder:text-black/30 dark:placeholder:text-white/30 rounded-xl" 
              placeholder="******" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-black dark:bg-white text-white dark:text-black font-inter tracking-[0.2em] font-semibold text-[11px] uppercase py-4 mt-2 flex items-center justify-center gap-3 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors group rounded-xl"
            disabled={loading}
          >
            {loading ? 'AGUARDE...' : isRegistering ? 'CRIAR CONTA' : 'ACESSAR PAINEL'}
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white font-bold transition-colors"
          >
            {isRegistering ? 'Já tenho uma conta. Entrar' : 'Não tem conta? Criar uma grátis'}
          </button>
        </div>
      </div>
    </div>
  );
}
