import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadialBarChart, RadialBar } from 'recharts';
import { TrendingDown, DollarSign, Zap, BarChart3, Sliders, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-lg p-3 text-xs">
      <div className="text-slate-400 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <span className="font-mono">${typeof p.value === 'number' ? p.value.toFixed(6) : p.value}</span></div>
      ))}
    </div>
  );
};

function SimulatorCard({ scenario, isPremium }) {
  const qualityColor = scenario.quality >= 95 ? 'text-emerald-400' : scenario.quality >= 88 ? 'text-yellow-400' : 'text-orange-400';
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`card p-5 space-y-4 ${isPremium ? 'border-indigo-500/30' : 'border-emerald-500/30'}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-white">{scenario.label}</div>
          <div className="text-xs text-slate-400 mt-0.5">{scenario.description}</div>
        </div>
        {!isPremium && scenario.savingsPct && (
          <span className="badge-green text-[10px]">-{scenario.savingsPct}%</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0f0f1a] rounded-lg p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Est. Cost</div>
          <div className="text-base font-bold text-white font-mono">${scenario.estimatedCost}</div>
          <div className="text-[10px] text-slate-500">per {'{n}'} reqs</div>
        </div>
        <div className="bg-[#0f0f1a] rounded-lg p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Avg Latency</div>
          <div className="text-base font-bold text-white font-mono">{scenario.avgLatency}ms</div>
        </div>
        <div className="bg-[#0f0f1a] rounded-lg p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Quality</div>
          <div className={`text-base font-bold font-mono ${qualityColor}`}>{scenario.quality}%</div>
        </div>
      </div>
      {!isPremium && scenario.savings && (
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          <TrendingDown size={12} /> Save ${scenario.savings} vs premium
        </div>
      )}
      <div className="text-xs text-slate-500">Model: <span className="text-slate-300">{scenario.model}</span></div>
    </motion.div>
  );
}

export default function CostOptimization() {
  const [stats, setStats] = useState(null);
  const [simResult, setSimResult] = useState(null);
  const [simForm, setSimForm] = useState({ text: 'function example() { return 42; }', requestCount: 100 });
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    api.stats().then(setStats);
  }, []);

  const runSim = async () => {
    setSimLoading(true);
    try {
      const res = await api.simulate(simForm);
      setSimResult(res);
    } finally {
      setSimLoading(false);
    }
  };

  const providerData = stats ? Object.entries(stats.providerCosts).map(([name, value]) => ({ name, value: +value.toFixed(6) })) : [];
  const modelData = stats ? Object.entries(stats.modelCosts).map(([name, value]) => ({ name: name.split('-').slice(-2).join('-'), value: +value.toFixed(6) })) : [];

  const savingsPct = parseFloat(stats?.savingsPct ?? 0);
  const gaugeData = [{ name: 'Savings', value: savingsPct, fill: '#10b981' }, { name: 'Cost', value: 100 - savingsPct, fill: '#1e1e35' }];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Cost Optimization</h1>
        <p className="text-sm text-slate-400 mt-0.5">Savings analysis & what-if simulator</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Cost', value: `$${parseFloat(stats?.totalCost ?? 0).toFixed(6)}`, sub: 'actual spend', icon: DollarSign, color: 'bg-indigo-600' },
          { label: 'Baseline Cost', value: `$${parseFloat(stats?.totalPremiumCost ?? 0).toFixed(6)}`, sub: 'if always premium', icon: BarChart3, color: 'bg-slate-600' },
          { label: 'Total Savings', value: `$${parseFloat(stats?.totalSavings ?? 0).toFixed(6)}`, sub: 'money saved', icon: TrendingDown, color: 'bg-emerald-600' },
          { label: 'Savings Rate', value: `${stats?.savingsPct ?? 0}%`, sub: 'vs premium baseline', icon: Zap, color: 'bg-purple-600' },
        ].map(({ label, value, sub, icon: Icon, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
              <Icon size={14} className="text-white" />
            </div>
            <div className="mt-3 text-xl font-bold text-white">{value}</div>
            <div className="text-xs text-slate-400">{label}</div>
            <div className="text-[10px] text-slate-500">{sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Daily Trend */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card p-5 col-span-2">
          <div className="text-sm font-semibold text-white mb-1">Daily Cost Trends</div>
          <div className="text-xs text-slate-500 mb-4">Cost vs savings over time</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={stats?.dailyTrends ?? []}>
              <defs>
                <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(4)}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="cost" name="Cost" stroke="#6366f1" fill="url(#gC)" strokeWidth={2} />
              <Area type="monotone" dataKey="savings" name="Savings" stroke="#10b981" fill="url(#gS)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Savings Gauge */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="card p-5 flex flex-col items-center justify-center">
          <div className="text-sm font-semibold text-white mb-1 self-start">Savings Rate</div>
          <div className="text-xs text-slate-500 mb-2 self-start">vs premium baseline</div>
          <ResponsiveContainer width="100%" height={140}>
            <RadialBarChart cx="50%" cy="70%" innerRadius="60%" outerRadius="90%" startAngle={180} endAngle={0} data={gaugeData}>
              <RadialBar dataKey="value" cornerRadius={4} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="text-3xl font-bold text-emerald-400 -mt-4">{savingsPct}%</div>
          <div className="text-xs text-slate-500 mt-1">cost reduction</div>
        </motion.div>
      </div>

      {/* Provider & Model */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card p-5">
          <div className="text-sm font-semibold text-white mb-1">Cost by Provider</div>
          <div className="text-xs text-slate-500 mb-4">Spend per AI provider</div>
          <ResponsiveContainer width="100%" height={150}>
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

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="card p-5">
          <div className="text-sm font-semibold text-white mb-1">Cost by Model</div>
          <div className="text-xs text-slate-500 mb-4">Per-model spend breakdown</div>
          <ResponsiveContainer width="100%" height={150}>
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

      {/* What-If Simulator */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sliders size={14} className="text-indigo-400" />
          <div className="text-sm font-semibold text-white">What-If Cost Simulator</div>
        </div>
        <div className="text-xs text-slate-500 mb-5">Compare routing strategies side-by-side</div>

        <div className="flex items-end gap-4 mb-6">
          <div className="flex-1">
            <label className="text-xs text-slate-400 mb-1.5 block">Sample Text / Code</label>
            <textarea className="input text-xs resize-none" rows={3} value={simForm.text}
              onChange={e => setSimForm(f => ({ ...f, text: e.target.value }))} />
          </div>
          <div className="w-36">
            <label className="text-xs text-slate-400 mb-1.5 block">Request Count</label>
            <input className="input" type="number" min={1} max={10000} value={simForm.requestCount}
              onChange={e => setSimForm(f => ({ ...f, requestCount: parseInt(e.target.value) || 100 }))} />
          </div>
          <button onClick={runSim} disabled={simLoading} className="btn-primary py-2.5">
            {simLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap size={14} />}
            Simulate
          </button>
        </div>

        {simResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle size={12} className="text-emerald-400" />
              Complexity detected: <span className="text-white font-medium capitalize">{simResult.complexity}</span>
              · {simResult.requestCount} requests simulated
            </div>
            <div className="grid grid-cols-3 gap-4">
              <SimulatorCard scenario={simResult.scenarios.premium} isPremium={true} />
              <SimulatorCard scenario={simResult.scenarios.balanced} isPremium={false} />
              <SimulatorCard scenario={simResult.scenarios.budget} isPremium={false} />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
