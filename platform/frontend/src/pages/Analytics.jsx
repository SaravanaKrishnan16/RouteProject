import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import { Shield, CheckCircle, AlertTriangle, XCircle, Clock, Cpu, Target, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-lg p-3 text-xs">
      <div className="text-slate-400 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <span className="font-mono">{p.value}</span></div>
      ))}
    </div>
  );
};

function HealthBadge({ health }) {
  if (health === 'healthy') return <span className="badge-green"><CheckCircle size={10} /> Healthy</span>;
  if (health === 'degraded') return <span className="badge-yellow"><AlertTriangle size={10} /> Degraded</span>;
  return <span className="badge-red"><XCircle size={10} /> Unhealthy</span>;
}

function ProviderCard({ p, i }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-white capitalize">{p.provider}</div>
          <div className="text-xs text-slate-500 mt-0.5">{p.totalCalls} total calls</div>
        </div>
        <HealthBadge health={p.health} />
      </div>
      <div className="space-y-3">
        {[
          { label: 'Success Rate', value: `${p.successRate}%`, color: 'bg-emerald-500', pct: parseFloat(p.successRate) },
          { label: 'Failure Rate', value: `${p.failureRate}%`, color: 'bg-red-500', pct: parseFloat(p.failureRate) },
        ].map(({ label, value, color, pct }) => (
          <div key={label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">{label}</span>
              <span className="text-white font-mono">{value}</span>
            </div>
            <div className="h-1.5 bg-[#0f0f1a] rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.3 + i * 0.05 }}
                className={`h-full rounded-full ${color}`} />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-400 flex items-center gap-1"><Clock size={10} /> Avg Latency</span>
          <span className="text-white font-mono">{p.avgLatency}ms</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.analytics().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const radarData = data?.nodeLatencies?.map(n => ({
    node: n.node.split(' ')[0],
    latency: n.avgLatency,
    calls: n.calls,
  })) ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Enterprise Analytics</h1>
        <p className="text-sm text-slate-400 mt-0.5">Provider health, model usage & routing accuracy</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Routing Accuracy', value: `${data?.routingAccuracy ?? 0}%`, icon: Target, color: 'bg-indigo-600' },
          { label: 'Total Tokens', value: (data?.totalTokens ?? 0).toLocaleString(), icon: Cpu, color: 'bg-purple-600' },
          { label: 'Total Cost', value: `$${(data?.totalCost ?? 0).toFixed(6)}`, icon: TrendingUp, color: 'bg-cyan-600' },
          { label: 'Providers Active', value: data?.providerStats?.length ?? 0, icon: Shield, color: 'bg-emerald-600' },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
              <Icon size={14} className="text-white" />
            </div>
            <div className="mt-3 text-xl font-bold text-white">{value}</div>
            <div className="text-xs text-slate-400">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Provider Health Cards */}
      <div>
        <div className="text-sm font-semibold text-white mb-3">Provider Health</div>
        <div className="grid grid-cols-3 gap-4">
          {(data?.providerStats ?? []).map((p, i) => <ProviderCard key={p.provider} p={p} i={i} />)}
          {(data?.providerStats ?? []).length === 0 && (
            <div className="col-span-3 card p-8 text-center text-slate-500 text-sm">No provider data yet. Submit code via Pipeline.</div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Model Usage */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card p-5">
          <div className="text-sm font-semibold text-white mb-1">Model Usage</div>
          <div className="text-xs text-slate-500 mb-4">Calls per model</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={(data?.modelUsage ?? []).map(m => ({ ...m, name: m.model.split('-').slice(-2).join('-') }))}>
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="calls" name="Calls" radius={[4, 4, 0, 0]}>
                {(data?.modelUsage ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Node Latency Radar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="card p-5">
          <div className="text-sm font-semibold text-white mb-1">Node Latency Profile</div>
          <div className="text-xs text-slate-500 mb-4">Average latency per pipeline node</div>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1e1e35" />
              <PolarAngleAxis dataKey="node" tick={{ fill: '#64748b', fontSize: 10 }} />
              <Radar name="Latency (ms)" dataKey="latency" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Token Consumption Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="card">
        <div className="p-5 border-b border-[#1e1e35]">
          <div className="text-sm font-semibold text-white">Token Consumption by Model</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e1e35]">
                {['Model', 'Provider', 'Calls', 'Tokens', 'Cost', 'Avg Cost/Call'].map(h => (
                  <th key={h} className="text-left text-xs text-slate-500 font-medium px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.modelUsage ?? []).map((m, i) => (
                <tr key={i} className="border-b border-[#1e1e35]/50 hover:bg-white/2 transition-colors">
                  <td className="px-5 py-3 text-white font-mono text-xs">{m.model}</td>
                  <td className="px-5 py-3">
                    <span className="badge-blue capitalize">{m.model.includes('claude') ? 'anthropic' : m.model.includes('gemini') ? 'google' : 'openai'}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-300">{m.calls}</td>
                  <td className="px-5 py-3 text-slate-300 font-mono">{m.tokens?.toLocaleString()}</td>
                  <td className="px-5 py-3 text-slate-300 font-mono">${m.cost?.toFixed(6)}</td>
                  <td className="px-5 py-3 text-slate-300 font-mono">${m.calls ? (m.cost / m.calls).toFixed(6) : '0'}</td>
                </tr>
              ))}
              {(data?.modelUsage ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500 text-sm">No data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
