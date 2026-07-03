import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle, Clock, Cpu, DollarSign, Zap, ChevronRight, AlertCircle, Code2, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';

const NODES = [
  { id: 'complexity', label: 'Complexity Analysis', icon: '🧠', color: 'indigo' },
  { id: 'syntax', label: 'Syntax Review', icon: '📝', color: 'blue' },
  { id: 'logic', label: 'Logic Review', icon: '⚙️', color: 'purple' },
  { id: 'optimization', label: 'Optimization', icon: '⚡', color: 'yellow' },
  { id: 'rubric', label: 'Rubric Eval', icon: '📊', color: 'pink' },
  { id: 'feedback', label: 'Feedback Gen', icon: '💬', color: 'emerald' },
];

const colorMap = {
  indigo: 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400',
  blue: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
  purple: 'border-purple-500/50 bg-purple-500/10 text-purple-400',
  yellow: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
  pink: 'border-pink-500/50 bg-pink-500/10 text-pink-400',
  emerald: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
};

const SAMPLE_CODE = `function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}

function merge(left, right) {
  const result = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) result.push(left[i++]);
    else result.push(right[j++]);
  }
  return result.concat(left.slice(i)).concat(right.slice(j));
}`;

function NodeCard({ node, result, isActive, isDone, index }) {
  const [expanded, setExpanded] = useState(false);
  const status = isDone ? 'done' : isActive ? 'active' : 'idle';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`card border transition-all duration-300 ${
        status === 'active' ? 'node-active border-indigo-500/60' :
        status === 'done' ? 'border-emerald-500/30' : 'border-[#1e1e35]'
      }`}
    >
      <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => isDone && setExpanded(!expanded)}>
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center text-base flex-shrink-0 ${colorMap[node.color]}`}>
          {node.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white">{node.label}</div>
          {result && (
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
              <span className="flex items-center gap-1"><Cpu size={10} />{result.model?.split('-').slice(-2).join('-')}</span>
              <span className="flex items-center gap-1"><Clock size={10} />{result.latency}ms</span>
              <span className="flex items-center gap-1"><DollarSign size={10} />${result.cost?.toFixed(6)}</span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          {status === 'active' && <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />}
          {status === 'done' && <CheckCircle size={18} className="text-emerald-400" />}
          {status === 'idle' && <div className="w-5 h-5 rounded-full border-2 border-[#2d2d4e]" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && result && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-[#1e1e35]">
            <div className="p-4 space-y-3">
              <div className="text-xs text-slate-300 leading-relaxed">{result.output}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#0f0f1a] rounded-lg p-2.5">
                  <div className="text-slate-500 mb-1">Routing Reason</div>
                  <div className="text-slate-300">{result.routingReason}</div>
                </div>
                <div className="bg-[#0f0f1a] rounded-lg p-2.5">
                  <div className="text-slate-500 mb-1">Confidence</div>
                  <div className="text-white font-mono">{(result.confidence * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-[#0f0f1a] rounded-lg p-2.5">
                  <div className="text-slate-500 mb-1">Tokens</div>
                  <div className="text-white font-mono">{result.inputTokens}↑ {result.outputTokens}↓</div>
                </div>
                <div className="bg-[#0f0f1a] rounded-lg p-2.5">
                  <div className="text-slate-500 mb-1">Savings vs Premium</div>
                  <div className="text-emerald-400 font-mono">${result.savings?.toFixed(6)}</div>
                </div>
              </div>
              <div className="bg-[#0f0f1a] rounded-lg p-2.5 text-xs">
                <div className="text-slate-500 mb-1">Fallback Chain</div>
                <div className="flex items-center gap-1 flex-wrap">
                  {result.fallbackChain?.map((m, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${i === 0 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-[#1e1e35] text-slate-400'}`}>{m.split('-').slice(-2).join('-')}</span>
                      {i < result.fallbackChain.length - 1 && <ChevronRight size={10} className="text-slate-600" />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Pipeline() {
  const [form, setForm] = useState({ studentName: 'Alice Chen', submissionType: 'Algorithm', code: SAMPLE_CODE, language: 'javascript' });
  const [running, setRunning] = useState(false);
  const [activeNode, setActiveNode] = useState(-1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  const run = async () => {
    if (!form.code.trim()) return;
    setRunning(true); setResult(null); setError(''); setActiveNode(0);

    // Animate nodes sequentially while waiting for API
    let nodeIdx = 0;
    intervalRef.current = setInterval(() => {
      nodeIdx++;
      if (nodeIdx < NODES.length) setActiveNode(nodeIdx);
      else clearInterval(intervalRef.current);
    }, 300);

    try {
      const res = await api.submit(form);
      clearInterval(intervalRef.current);
      setActiveNode(-1);
      setResult(res);
    } catch (e) {
      clearInterval(intervalRef.current);
      setError(e.message);
    } finally {
      setRunning(false);
      setActiveNode(-1);
    }
  };

  const reset = () => { setResult(null); setError(''); setActiveNode(-1); };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Student Assessment Pipeline</h1>
          <p className="text-sm text-slate-400 mt-0.5">Multi-node AI evaluation with intelligent routing</p>
        </div>
        {result && (
          <button onClick={reset} className="btn-ghost text-sm">
            <RotateCcw size={14} /> New Submission
          </button>
        )}
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Left: Form */}
        <div className="col-span-2 space-y-4">
          <div className="card p-5 space-y-4">
            <div className="text-sm font-semibold text-white flex items-center gap-2"><Code2 size={14} className="text-indigo-400" /> Submission Details</div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Student Name</label>
              <input className="input" value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Submission Type</label>
              <select className="input" value={form.submissionType} onChange={e => setForm(f => ({ ...f, submissionType: e.target.value }))}>
                {['Algorithm', 'Data Structures', 'Dynamic Programming', 'Graph Theory', 'System Design', 'Code Review'].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Language</label>
              <select className="input" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                {['javascript', 'python', 'java', 'cpp', 'typescript'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Code Submission</label>
              <textarea className="input font-mono text-xs resize-none" rows={12} value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="Paste student code here..." />
            </div>
            <button onClick={run} disabled={running || !form.code.trim()} className="btn-primary w-full justify-center py-2.5">
              {running ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play size={14} />}
              {running ? 'Analyzing...' : 'Run Pipeline'}
            </button>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle size={14} /> {error}
              </div>
            )}
          </div>

          {/* Result Summary */}
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5 space-y-3">
              <div className="text-sm font-semibold text-white">Pipeline Summary</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Score', value: `${result.score}/100`, color: 'text-indigo-400' },
                  { label: 'Complexity', value: result.complexity, color: result.complexity === 'complex' ? 'text-red-400' : result.complexity === 'moderate' ? 'text-yellow-400' : 'text-emerald-400' },
                  { label: 'Total Cost', value: `$${result.totalCost?.toFixed(6)}`, color: 'text-white' },
                  { label: 'Savings', value: `${result.savingsPct}%`, color: 'text-emerald-400' },
                  { label: 'Tokens', value: result.totalTokens?.toLocaleString(), color: 'text-white' },
                  { label: 'Latency', value: `${result.totalLatency}ms`, color: 'text-white' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-[#0f0f1a] rounded-lg p-2.5">
                    <div className="text-[10px] text-slate-500">{label}</div>
                    <div className={`text-sm font-semibold mt-0.5 ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right: Pipeline Nodes */}
        <div className="col-span-3 space-y-2">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap size={10} className="text-indigo-400" /> Pipeline Nodes — click completed nodes to inspect
          </div>
          {NODES.map((node, i) => (
            <NodeCard
              key={node.id}
              node={node}
              index={i}
              result={result?.nodeResults?.find(n => n.nodeId === node.id)}
              isActive={activeNode === i}
              isDone={result != null || (running && activeNode > i)}
            />
          ))}

          {/* Flow connector visual */}
          {!result && !running && (
            <div className="flex flex-col items-center py-4 opacity-30">
              <svg width="2" height="40"><line x1="1" y1="0" x2="1" y2="40" stroke="#4f46e5" strokeWidth="2" strokeDasharray="4 3" /></svg>
              <div className="text-xs text-slate-500">Submit code to start pipeline</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
