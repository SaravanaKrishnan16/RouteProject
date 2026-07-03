import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, GitBranch, Activity, DollarSign, BarChart3, History, LogOut, Zap, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pipeline', icon: GitBranch, label: 'Pipeline' },
  { to: '/observability', icon: Activity, label: 'Observability' },
  { to: '/cost', icon: DollarSign, label: 'Cost Optimizer' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/history', icon: History, label: 'History' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-[#0a0a14] border-r border-[#1e1e35] flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-[#1e1e35]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">RouteIQ</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">AI Operations</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-[#1e1e35]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">{user?.name}</div>
              <div className="text-[10px] text-slate-500 truncate">{user?.email}</div>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }} className="text-slate-500 hover:text-red-400 transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
