import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Zap, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: 'demo@routeiq.ai', password: 'demo123', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.email, form.password, form.name);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a14] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-600/30">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">RouteIQ</h1>
          <p className="text-slate-400 text-sm mt-1">Intelligent Model Routing Platform</p>
        </div>

        <div className="card p-6">
          {/* Tabs */}
          <div className="flex gap-1 bg-[#0f0f1a] rounded-lg p-1 mb-6">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Full Name</label>
                <input className="input" placeholder="John Doe" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
            )}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Password</label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <p className="text-xs text-indigo-300 text-center">Demo: <span className="font-mono">demo@routeiq.ai</span> / <span className="font-mono">demo123</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
