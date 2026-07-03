import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, Clock, DollarSign, Cpu, ChevronRight, Search, Filter } from 'lucide-react';
import { api } from '../lib/api';

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

function TraceRow({ trace, submissions, onSelect, selected }) {
  const sub = submissions.find(s => s.id === trace.submissionId);
  const totalCost = trace.nodes.reduce((a, n) => a + n.cost, 0);
  const totalLatency = trace.nodes.reduce((a, n) => a + n.latency, 0);
  const isSelected = selected?.id === trace.id;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      onClick={() => onSelect(isSelected ? null : trace)}
      className={`card p-4 cursor-pointer transition-all duration-200 ${isSelected ? 'border-indigo-500/50 bg-indigo-500/5' : 'hover:border-[#2d2d4e]'}`}>
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-indigo-400">{trace.id}</span>
            <span className="badge-green text-[10px]">completed</span>
          </div>
          <div className="text-sm text-white mt-0.5">{sub?.studentName || 'Unknown'} — {sub?.submissionType}</div>
          <div className="text-xs text-slate-500 mt-0.5">{new Date(trace.createdAt).toLocaleString()}</div>
        </div>
        <div className="flex items-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Clock size={10} />{totalLatency}ms</span>
          <span className="flex items-center gap-1"><DollarSign size={10} />${totalCost.toFixed(6)}</span>
          <span className="flex items-center gap-1"><Cpu size={10} />{trace.nodes.length} nodes</span>
        </div>
        <ChevronRight size={14} className={`text-slate-500 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
      </div>

      {isSelected && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 border-t border-[#1e1e35] pt-4">
          {/* Timeline */}
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Request Timeline</div>
          <div className="space-y-2">
            {trace.nodes.map((node, i) => {
              const pct = Math.min(100, (node.latency / 3000) * 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-28 text-xs text-slate-400 truncate">{node.nodeName}</div>
                  <div className="flex-1 bg-[#0f0f1a] rounded-full h-2 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.05 }}
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                  </div>
                  <div className="w-16 text-xs text-slate-400 text-right font-mono">{node.latency}ms</div>
                  <div className="w-20 text-xs text-slate-400 text-right font-mono">${node.cost.toFixed(6)}</div>
                  <div className="w-24 text-xs text-slate-500 truncate">{node.model?.split('-').slice(-2).join('-')}</div>
                </div>
              );
            })}
          </div>

          {/* Node latency chart */}
          <div className="mt-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Node Latency (ms)</div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={trace.nodes.map(n => ({ name: n.nodeName.split(' ')[0], latency: n.latency, cost: n.cost }))}>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="latency" name="Latency (ms)" radius={[3, 3, 0, 0]}>
                  {trace.nodes.map((_, i) => <Cell key={i} fill={['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'][i % 6]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Decision panel */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {trace.nodes.slice(0, 3).map((node, i) => (
              <div key={i} className="bg-[#0f0f1a] rounded-lg p-3 text-xs space-y-1.5">
                <div className="text-slate-400 font-medium">{node.nodeName}</div>
                <div className="flex justify-between"><span className="text-slate-500">Model</span><span className="text-white font-mono text-[10px]">{node.model?.split('-').slice(-2).join('-')}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Confidence</span><span className="text-indigo-400">{(node.confidence * 100).toFixed(0)}%</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Tokens</span><span className="text-white">{node.inputTokens + node.outputTokens}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Savings</span><span className="text-emerald-400">${node.savings?.toFixed(6)}</span></div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function Observability() {
  const [traces, setTraces] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.traces(), api.submissions(1)]).then(([t, s]) => {
      setTraces(t);
      setSubmissions(s.data);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = traces.filter(t => {
    const sub = submissions.find(s => s.id === t.submissionId);
    return !search || t.id.includes(search) || sub?.studentName?.toLowerCase().includes(search.toLowerCase());
  });

  // Aggregate stats
  const allNodes = traces.flatMap(t => t.nodes);
  const avgLatency = allNodes.length ? Math.floor(allNodes.reduce((a, n) => a + n.latency, 0) / allNodes.length) : 0;
  const totalTokens = allNodes.reduce((a, n) => a + n.inputTokens + n.outputTokens, 0);
  const totalCost = allNodes.reduce((a, n) => a + n.cost, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Observability</h1>
        <p className="text-sm text-slate-400 mt-0.5">Trace explorer & request timeline</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Traces', value: traces.length, icon: Activity, color: 'bg-indigo-600' },
          { label: 'Avg Latency', value: `${avgLatency}ms`, icon: Clock, color: 'bg-purple-600' },
          { label: 'Total Tokens', value: totalTokens.toLocaleString(), icon: Cpu, color: 'bg-cyan-600' },
          { label: 'Total Cost', value: `$${totalCost.toFixed(6)}`, icon: DollarSign, color: 'bg-emerald-600' },
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

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9" placeholder="Search traces..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Filter size={12} /> {filtered.length} traces
        </div>
      </div>

      {/* Trace List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Activity size={32} className="text-slate-600 mx-auto mb-3" />
          <div className="text-slate-400 text-sm">No traces yet. Submit code via the Pipeline page.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(trace => (
            <TraceRow key={trace.id} trace={trace} submissions={submissions} onSelect={setSelected} selected={selected} />
          ))}
        </div>
      )}
    </div>
  );
}
