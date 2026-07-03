import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { TrendingDown, Zap, DollarSign, Activity, BarChart3, ArrowUpRight, ArrowDownRight, Cpu, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

function KPI({ label, value, sub, icon: Icon, color, trend, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="stat-card glow">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-slate-400 mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-slate-500 mt-1">{sub}</div>}
      </div>
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-lg p-3 text-xs">
      <div className="text-slate-400 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }} className="flex gap-2">
          <span>{p.name}:</span><span className="font-mono">{typeof p.value === 'number' && p.value < 1 ? `$${p.value.toFixed(6)}` : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.stats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const providerData = stats ? Object.entries(stats.providerCosts).map(([name, value]) => ({ name, value })) : [];
  const modelData = stats ? Object.entries(stats.modelCosts).map(([name, value]) => ({ name: name.split('-').slice(-2).join('-'), value: +value.toFixed(6) })) : [];
  const complexityData = stats ? [
    { name: 'Simple', value: stats.complexityBreakdown.simple, fill: '#10b981' },
    { name: 'Moderate', value: stats.complexityBreakdown.moderate, fill: '#f59e0b' },
    { name: 'Complex', value: stats.complexityBreakdown.complex, fill: '#6366f1' },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Overview</h1>
          <p className="text-sm text-slate-400 mt-0.5">AI routing performance at a glance</p>
        </div>
        <Link to="/pipeline" className="btn-primary text-sm">
          <Zap size={14} /> New Submission
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Total Requests" value={stats?.totalRequests ?? 0} icon={Activity} color="bg-indigo-600" trend={12} delay={0} />
        <KPI label="Total Savings" value={`$${parseFloat(stats?.totalSavings ?? 0).toFixed(4)}`} sub={`${stats?.savingsPct ?? 0}% vs premium`} icon={TrendingDown} color="bg-emerald-600" trend={8} delay={0.05} />
        <KPI label="Total Cost" value={`$${parseFloat(stats?.totalCost ?? 0).toFixed(4)}`} sub={`vs $${parseFloat(stats?.totalPremiumCost ?? 0).toFixed(4)} baseline`} icon={DollarSign} color="bg-purple-600" delay={0.1} />
        <KPI label="Avg Latency" value={`${stats?.avgLatency ?? 0}ms`} sub={`${stats?.successRate ?? 100}% success rate`} icon={Cpu} color="bg-cyan-600" trend={-3} delay={0.15} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Daily Trend */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold text-white">Cost vs Savings Trend</div>
              <div className="text-xs text-slate-500">Last 7 days</div>
            </div>
            <span className="badge-green"><CheckCircle size={10} /> Optimized</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={stats?.dailyTrends ?? []}>
              <defs>
                <linearGradient id="gCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSave" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(4)}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="cost" name="Cost" stroke="#6366f1" fill="url(#gCost)" strokeWidth={2} />
              <Area type="monotone" dataKey="savings" name="Savings" stroke="#10b981" fill="url(#gSave)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Complexity Breakdown */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="card p-5">
          <div className="text-sm font-semibold text-white mb-1">Complexity Mix</div>
          <div className="text-xs text-slate-500 mb-4">Submission distribution</div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={complexityData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                {complexityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {complexityData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                  <span className="text-slate-400">{d.name}</span>
                </div>
                <span className="text-white font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Provider Costs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card p-5">
          <div className="text-sm font-semibold text-white mb-1">Cost by Provider</div>
          <div className="text-xs text-slate-500 mb-4">Spend distribution</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={providerData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(5)}`} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Cost" radius={[0, 4, 4, 0]}>
                {providerData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Model Costs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="card p-5">
          <div className="text-sm font-semibold text-white mb-1">Cost by Model</div>
          <div className="text-xs text-slate-500 mb-4">Per-model spend</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={modelData}>
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(5)}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Cost" radius={[4, 4, 0, 0]}>
                {modelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Savings Banner */}
      {parseFloat(stats?.savingsPct ?? 0) > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="card p-5 border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <TrendingDown size={20} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Intelligent routing saved you <span className="text-emerald-400">{stats.savingsPct}%</span> vs always using premium models</div>
              <div className="text-xs text-slate-400 mt-0.5">Total saved: ${parseFloat(stats.totalSavings).toFixed(6)} across {stats.totalRequests} requests</div>
            </div>
          </div>
          <Link to="/cost" className="btn-ghost text-sm text-emerald-400 hover:text-emerald-300">
            <BarChart3 size={14} /> View Details
          </Link>
        </motion.div>
      )}
    </div>
  );
}
