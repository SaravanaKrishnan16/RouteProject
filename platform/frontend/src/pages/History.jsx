import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History as HistoryIcon, Search, ChevronRight, DollarSign, Clock, Star, Play, X, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

function ComplexityBadge({ level }) {
  const map = { simple: 'badge-green', moderate: 'badge-yellow', complex: 'badge-purple' };
  return <span className={map[level] || 'badge-blue'}>{level}</span>;
}

function ReplayModal({ submissionId, onClose }) {
  const [steps, setSteps] = useState([]);
  const [current, setCurrent] = useState(-1);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    api.replay(submissionId).then(r => setSteps(r.steps));
  }, [submissionId]);

  const play = () => {
    setPlaying(true);
    setCurrent(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i < steps.length) setCurrent(i);
      else { clearInterval(interval); setPlaying(false); }
    }, 700);
  };

  const reset = () => { setCurrent(-1); setPlaying(false); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="card w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-[#1e1e35] flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Routing Replay</div>
            <div className="text-xs text-slate-500 mt-0.5">Step-by-step routing visualization</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={reset} className="btn-ghost text-xs py-1.5 px-3">Reset</button>
            <button onClick={play} disabled={playing || steps.length === 0} className="btn-primary text-xs py-1.5 px-3">
              <Play size={12} /> {playing ? 'Playing...' : 'Play'}
            </button>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={14} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {steps.map((step, i) => {
            const isActive = current === i;
            const isDone = current > i;
            return (
              <motion.div key={i} initial={{ opacity: 0.4 }} animate={{ opacity: isActive || isDone ? 1 : 0.4 }}
                className={`card p-4 transition-all duration-300 ${isActive ? 'node-active border-indigo-500/60' : isDone ? 'border-emerald-500/30' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isDone ? 'bg-emerald-500/20 text-emerald-400' : isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-[#1e1e35] text-slate-500'
                  }`}>
                    {isDone ? <CheckCircle size={14} /> : step.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{step.nodeName}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{step.routingReason}</div>
                  </div>
                  {(isActive || isDone) && (
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="font-mono text-white">{step.model?.split('-').slice(-2).join('-')}</span>
                      <span>{step.latency}ms</span>
                      <span className="text-emerald-400">${step.cost?.toFixed(6)}</span>
                    </div>
                  )}
                </div>
                {isActive && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 pt-3 border-t border-[#1e1e35]">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-[#0f0f1a] rounded p-2">
                        <div className="text-slate-500">Complexity</div>
                        <div className="text-white capitalize mt-0.5">{step.complexity}</div>
                      </div>
                      <div className="bg-[#0f0f1a] rounded p-2">
                        <div className="text-slate-500">Confidence</div>
                        <div className="text-indigo-400 mt-0.5">{(step.confidence * 100).toFixed(0)}%</div>
                      </div>
                      <div className="bg-[#0f0f1a] rounded p-2">
                        <div className="text-slate-500">Tokens</div>
                        <div className="text-white mt-0.5">{step.tokens?.input + step.tokens?.output}</div>
                      </div>
                    </div>
                    <div className="mt-2 bg-[#0f0f1a] rounded p-2 text-xs text-slate-300 leading-relaxed">{step.output}</div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
          {steps.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">Loading replay data...</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function History() {
  const [data, setData] = useState({ data: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [replayId, setReplayId] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.submissions(page).then(setData).finally(() => setLoading(false));
  }, [page]);

  const filtered = data.data.filter(s =>
    !search || s.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    s.submissionType?.toLowerCase().includes(search.toLowerCase()) ||
    s.id.includes(search)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Submission History</h1>
          <p className="text-sm text-slate-400 mt-0.5">{data.total} total submissions</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9 w-64" placeholder="Search submissions..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <HistoryIcon size={32} className="text-slate-600 mx-auto mb-3" />
          <div className="text-slate-400 text-sm">No submissions yet. Try the Pipeline page.</div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e1e35]">
                {['Student', 'Type', 'Complexity', 'Model', 'Score', 'Cost', 'Savings', 'Time', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs text-slate-500 font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <>
                  <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="border-b border-[#1e1e35]/50 hover:bg-white/2 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{s.studentName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{s.id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{s.submissionType}</td>
                    <td className="px-4 py-3"><ComplexityBadge level={s.complexity} /></td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">{s.model?.split('-').slice(-2).join('-')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Star size={11} className="text-yellow-400" />
                        <span className="text-white font-medium">{s.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">${s.cost?.toFixed(6)}</td>
                    <td className="px-4 py-3 text-emerald-400 font-mono text-xs">${s.savings?.toFixed(6)}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(s.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={e => { e.stopPropagation(); setReplayId(s.id); }}
                          className="btn-ghost text-xs py-1 px-2 text-indigo-400 hover:text-indigo-300">
                          <Play size={11} /> Replay
                        </button>
                        <ChevronRight size={14} className={`text-slate-500 transition-transform ${expanded === s.id ? 'rotate-90' : ''}`} />
                      </div>
                    </td>
                  </motion.tr>
                  <AnimatePresence>
                    {expanded === s.id && (
                      <motion.tr key={`${s.id}-exp`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <td colSpan={9} className="px-4 py-4 bg-[#0f0f1a] border-b border-[#1e1e35]">
                          <div className="text-xs text-slate-300 leading-relaxed">
                            <span className="text-slate-500 font-medium">Feedback: </span>{s.feedback}
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e1e35]">
              <div className="text-xs text-slate-500">Page {page} of {data.pages}</div>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost text-xs py-1 px-3 disabled:opacity-40">Prev</button>
                <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages} className="btn-ghost text-xs py-1 px-3 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {replayId && <ReplayModal submissionId={replayId} onClose={() => setReplayId(null)} />}
      </AnimatePresence>
    </div>
  );
}
