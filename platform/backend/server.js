import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
const PY_DASH = process.env.LLM_ROUTER_DASHBOARD_URL || 'http://localhost:7337';
const PY_TOKEN = process.env.LLM_ROUTER_DASHBOARD_TOKEN || '';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'routeiq-hackathon-secret-2024';

app.use(cors({ origin: ['http://localhost:5173', 'http://192.168.32.159:5173'], credentials: true }));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

// ── In-memory store ──────────────────────────────────────────────────────────
const users = new Map();
const submissions = [];
const traces = [];

// Seed demo user
const demoHash = bcrypt.hashSync('demo123', 10);
users.set('demo@routeiq.ai', { id: 'usr_demo', email: 'demo@routeiq.ai', name: 'Demo User', hash: demoHash });

// ── Auth middleware ──────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Auth routes ──────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.get(email);
  if (!user || !bcrypt.compareSync(password, user.hash))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (users.has(email)) return res.status(409).json({ error: 'Email already exists' });
  const hash = bcrypt.hashSync(password, 10);
  const user = { id: `usr_${uuidv4().slice(0, 8)}`, email, name, hash };
  users.set(email, user);
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.get('/api/auth/me', auth, (req, res) => res.json(req.user));

// ── Routing simulation engine ────────────────────────────────────────────────
const MODELS = {
  premium: { name: 'claude-opus-4', provider: 'anthropic', costPer1k: 0.015, latencyBase: 2800 },
  balanced: { name: 'claude-sonnet-4', provider: 'anthropic', costPer1k: 0.003, latencyBase: 1200 },
  budget: { name: 'gemini-2.5-flash', provider: 'google', costPer1k: 0.0003, latencyBase: 600 },
  fast: { name: 'gpt-4o-mini', provider: 'openai', costPer1k: 0.00015, latencyBase: 400 },
};

const PIPELINE_NODES = [
  { id: 'complexity', name: 'Complexity Analysis', description: 'Analyzes submission complexity' },
  { id: 'syntax', name: 'Syntax Review', description: 'Reviews code syntax and structure' },
  { id: 'logic', name: 'Logic Review', description: 'Evaluates logical correctness' },
  { id: 'optimization', name: 'Optimization Review', description: 'Suggests performance improvements' },
  { id: 'rubric', name: 'Rubric Evaluation', description: 'Scores against rubric criteria' },
  { id: 'feedback', name: 'Feedback Generation', description: 'Generates actionable feedback' },
];

function classifyComplexity(text) {
  const len = text.length;
  if (len < 300) return { level: 'simple', score: 0.2 + Math.random() * 0.2, profile: 'budget' };
  if (len < 1500) return { level: 'moderate', score: 0.45 + Math.random() * 0.2, profile: 'balanced' };
  return { level: 'complex', score: 0.75 + Math.random() * 0.2, profile: 'premium' };
}

function selectModel(complexity, nodeId) {
  const nodeComplexityMap = {
    complexity: 'fast', syntax: 'budget', logic: 'balanced',
    optimization: 'balanced', rubric: 'premium', feedback: 'balanced',
  };
  const override = nodeComplexityMap[nodeId];
  if (complexity.level === 'simple') return MODELS[override === 'premium' ? 'balanced' : override] || MODELS.budget;
  if (complexity.level === 'complex') return MODELS[override === 'fast' ? 'balanced' : override] || MODELS.premium;
  return MODELS[override] || MODELS.balanced;
}

function simulateNodeExecution(node, model, text) {
  const tokens = { input: Math.floor(text.length / 4) + 50, output: Math.floor(50 + Math.random() * 200) };
  const cost = ((tokens.input + tokens.output) / 1000) * model.costPer1k;
  const latency = model.latencyBase + Math.floor(Math.random() * 800 - 400);
  const premiumCost = ((tokens.input + tokens.output) / 1000) * MODELS.premium.costPer1k;
  return { tokens, cost, latency, premiumCost, savings: premiumCost - cost };
}

function generateNodeResult(nodeId, text, score) {
  const results = {
    complexity: `Complexity Score: ${(score * 10).toFixed(1)}/10. The submission demonstrates ${score > 0.6 ? 'advanced' : score > 0.4 ? 'intermediate' : 'basic'} understanding.`,
    syntax: `Syntax analysis complete. ${score > 0.7 ? 'Code follows best practices with proper structure.' : 'Minor syntax improvements suggested for readability.'}`,
    logic: `Logic evaluation: ${score > 0.65 ? 'Sound algorithmic approach with correct implementation.' : 'Logic is mostly correct with some edge cases to address.'}`,
    optimization: `Performance review: ${score > 0.7 ? 'Efficient implementation. Time complexity is optimal.' : 'Consider optimizing loops and reducing redundant operations.'}`,
    rubric: `Rubric score: ${Math.floor(score * 100)}/100. Meets ${score > 0.7 ? 'all' : 'most'} assessment criteria.`,
    feedback: `Overall feedback: Strong submission showing ${score > 0.7 ? 'excellent' : 'good'} grasp of concepts. Focus on ${score > 0.7 ? 'edge cases and documentation' : 'code organization and testing'}.`,
  };
  return results[nodeId] || 'Analysis complete.';
}

// ── Pipeline execution ───────────────────────────────────────────────────────
app.post('/api/pipeline/submit', auth, async (req, res) => {
  const { studentName, submissionType, code, language = 'javascript' } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });

  const submissionId = `sub_${uuidv4().slice(0, 8)}`;
  const traceId = `trace_${uuidv4().slice(0, 8)}`;
  const complexity = classifyComplexity(code);
  const fallbackChain = [MODELS.premium.name, MODELS.balanced.name, MODELS.budget.name];

  const nodeResults = [];
  let totalCost = 0, totalPremiumCost = 0, totalTokens = 0;
  let startTime = Date.now();

  for (const node of PIPELINE_NODES) {
    const model = selectModel(complexity, node.id);
    const exec = simulateNodeExecution(node, model, code);
    const nodeStart = Date.now();
    await new Promise(r => setTimeout(r, 20)); // simulate async

    const result = {
      nodeId: node.id,
      nodeName: node.name,
      model: model.name,
      provider: model.provider,
      inputTokens: exec.tokens.input,
      outputTokens: exec.tokens.output,
      cost: exec.cost,
      premiumCost: exec.premiumCost,
      savings: exec.savings,
      latency: exec.latency,
      status: 'success',
      output: generateNodeResult(node.id, code, complexity.score),
      timestamp: new Date().toISOString(),
      routingReason: `${complexity.level} complexity → ${model.name}`,
      confidence: 0.85 + Math.random() * 0.1,
      fallbackChain,
    };

    nodeResults.push(result);
    totalCost += exec.cost;
    totalPremiumCost += exec.premiumCost;
    totalTokens += exec.tokens.input + exec.tokens.output;
  }

  const finalScore = Math.floor(complexity.score * 100);
  const submission = {
    id: submissionId,
    traceId,
    studentName: studentName || 'Anonymous',
    submissionType: submissionType || 'Code Review',
    language,
    code,
    complexity: complexity.level,
    complexityScore: complexity.score,
    totalCost,
    totalPremiumCost,
    totalSavings: totalPremiumCost - totalCost,
    savingsPct: ((totalPremiumCost - totalCost) / totalPremiumCost * 100).toFixed(1),
    totalTokens,
    totalLatency: Date.now() - startTime,
    score: finalScore,
    feedback: nodeResults.find(n => n.nodeId === 'feedback')?.output || '',
    nodeResults,
    userId: req.user.id,
    timestamp: new Date().toISOString(),
    status: 'completed',
  };

  submissions.unshift(submission);
  traces.unshift({ id: traceId, submissionId, nodes: nodeResults, createdAt: new Date().toISOString() });

  res.json(submission);
});

// ── Dashboard stats ──────────────────────────────────────────────────────────
app.get('/api/dashboard/stats', auth, (req, res) => {
  const userSubs = submissions.filter(s => s.userId === req.user.id);
  const totalCost = userSubs.reduce((a, s) => a + s.totalCost, 0);
  const totalPremium = userSubs.reduce((a, s) => a + s.totalPremiumCost, 0);
  const totalSavings = totalPremium - totalCost;
  const totalTokens = userSubs.reduce((a, s) => a + s.totalTokens, 0);

  // Provider breakdown
  const providerCosts = {};
  const modelCosts = {};
  userSubs.forEach(s => {
    s.nodeResults.forEach(n => {
      providerCosts[n.provider] = (providerCosts[n.provider] || 0) + n.cost;
      modelCosts[n.model] = (modelCosts[n.model] || 0) + n.cost;
    });
  });

  // Daily trends (last 7 days)
  const dailyTrends = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('en', { weekday: 'short' });
    const daySubs = userSubs.filter(s => new Date(s.timestamp).toDateString() === d.toDateString());
    return {
      date: label,
      cost: daySubs.reduce((a, s) => a + s.totalCost, 0),
      savings: daySubs.reduce((a, s) => a + s.totalSavings, 0),
      requests: daySubs.length,
    };
  });

  res.json({
    totalRequests: userSubs.length,
    totalCost: totalCost.toFixed(6),
    totalPremiumCost: totalPremium.toFixed(6),
    totalSavings: totalSavings.toFixed(6),
    savingsPct: totalPremium > 0 ? ((totalSavings / totalPremium) * 100).toFixed(1) : '0',
    totalTokens,
    avgLatency: userSubs.length ? Math.floor(userSubs.reduce((a, s) => a + s.totalLatency, 0) / userSubs.length) : 0,
    successRate: userSubs.length ? ((userSubs.filter(s => s.status === 'completed').length / userSubs.length) * 100).toFixed(1) : '100',
    providerCosts,
    modelCosts,
    dailyTrends,
    complexityBreakdown: {
      simple: userSubs.filter(s => s.complexity === 'simple').length,
      moderate: userSubs.filter(s => s.complexity === 'moderate').length,
      complex: userSubs.filter(s => s.complexity === 'complex').length,
    },
  });
});

// ── Submissions history ──────────────────────────────────────────────────────
app.get('/api/submissions', auth, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const userSubs = submissions.filter(s => s.userId === req.user.id);
  const total = userSubs.length;
  const data = userSubs.slice((page - 1) * limit, page * limit).map(s => ({
    id: s.id, traceId: s.traceId, studentName: s.studentName,
    submissionType: s.submissionType, complexity: s.complexity,
    model: s.nodeResults[0]?.model, cost: s.totalCost, savings: s.totalSavings,
    score: s.score, feedback: s.feedback, timestamp: s.timestamp, status: s.status,
  }));
  res.json({ data, total, page, pages: Math.ceil(total / limit) });
});

app.get('/api/submissions/:id', auth, (req, res) => {
  const sub = submissions.find(s => s.id === req.params.id && s.userId === req.user.id);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  res.json(sub);
});

// ── Traces / Observability ───────────────────────────────────────────────────
app.get('/api/traces', auth, (req, res) => {
  const userTraces = traces.filter(t => {
    const sub = submissions.find(s => s.id === t.submissionId);
    return sub?.userId === req.user.id;
  });
  res.json(userTraces.slice(0, 20));
});

app.get('/api/traces/:id', auth, (req, res) => {
  const trace = traces.find(t => t.id === req.params.id);
  if (!trace) return res.status(404).json({ error: 'Not found' });
  res.json(trace);
});

// ── Analytics ────────────────────────────────────────────────────────────────
app.get('/api/analytics', auth, (req, res) => {
  const userSubs = submissions.filter(s => s.userId === req.user.id);
  const allNodes = userSubs.flatMap(s => s.nodeResults);

  const providerHealth = {};
  const modelUsage = {};
  allNodes.forEach(n => {
    if (!providerHealth[n.provider]) providerHealth[n.provider] = { success: 0, total: 0, latencies: [] };
    providerHealth[n.provider].total++;
    if (n.status === 'success') providerHealth[n.provider].success++;
    providerHealth[n.provider].latencies.push(n.latency);

    if (!modelUsage[n.model]) modelUsage[n.model] = { calls: 0, tokens: 0, cost: 0 };
    modelUsage[n.model].calls++;
    modelUsage[n.model].tokens += n.inputTokens + n.outputTokens;
    modelUsage[n.model].cost += n.cost;
  });

  const providerStats = Object.entries(providerHealth).map(([provider, data]) => ({
    provider,
    successRate: data.total ? (data.success / data.total * 100).toFixed(1) : '100',
    failureRate: data.total ? ((data.total - data.success) / data.total * 100).toFixed(1) : '0',
    avgLatency: data.latencies.length ? Math.floor(data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length) : 0,
    totalCalls: data.total,
    health: data.total ? (data.success / data.total > 0.95 ? 'healthy' : data.success / data.total > 0.8 ? 'degraded' : 'unhealthy') : 'healthy',
  }));

  const nodeLatencies = PIPELINE_NODES.map(node => {
    const nodeData = allNodes.filter(n => n.nodeId === node.id);
    return {
      node: node.name,
      avgLatency: nodeData.length ? Math.floor(nodeData.reduce((a, n) => a + n.latency, 0) / nodeData.length) : 0,
      calls: nodeData.length,
    };
  });

  // Routing accuracy: how often did the router pick the optimal model
  const routingAccuracy = allNodes.length > 0
    ? (allNodes.filter(n => n.savings > 0).length / allNodes.length * 100).toFixed(1)
    : '0';

  res.json({
    providerStats,
    modelUsage: Object.entries(modelUsage).map(([model, data]) => ({ model, ...data })),
    nodeLatencies,
    routingAccuracy,
    totalTokens: allNodes.reduce((a, n) => a + n.inputTokens + n.outputTokens, 0),
    totalCost: allNodes.reduce((a, n) => a + n.cost, 0),
  });
});

// ── What-If Cost Simulator ───────────────────────────────────────────────────
app.post('/api/simulator', auth, (req, res) => {
  const { text = '', requestCount = 100 } = req.body;
  const complexity = classifyComplexity(text || 'x'.repeat(500));
  const avgTokens = Math.floor(text.length / 4) + 300;

  const scenarios = {
    premium: {
      label: 'Always Premium',
      model: MODELS.premium.name,
      estimatedCost: (avgTokens / 1000 * MODELS.premium.costPer1k * requestCount).toFixed(4),
      avgLatency: MODELS.premium.latencyBase,
      quality: 98,
      description: 'Maximum quality, highest cost',
    },
    balanced: {
      label: 'Balanced Routing',
      model: 'Intelligent Mix',
      estimatedCost: (avgTokens / 1000 * (MODELS.balanced.costPer1k * 0.4 + MODELS.budget.costPer1k * 0.6) * requestCount).toFixed(4),
      avgLatency: Math.floor(MODELS.balanced.latencyBase * 0.6 + MODELS.budget.latencyBase * 0.4),
      quality: 91,
      description: 'Optimal cost-quality balance',
    },
    budget: {
      label: 'Budget Routing',
      model: MODELS.budget.name,
      estimatedCost: (avgTokens / 1000 * MODELS.budget.costPer1k * requestCount).toFixed(4),
      avgLatency: MODELS.budget.latencyBase,
      quality: 82,
      description: 'Minimum cost, good quality',
    },
  };

  const premiumCost = parseFloat(scenarios.premium.estimatedCost);
  scenarios.balanced.savings = (premiumCost - parseFloat(scenarios.balanced.estimatedCost)).toFixed(4);
  scenarios.budget.savings = (premiumCost - parseFloat(scenarios.budget.estimatedCost)).toFixed(4);
  scenarios.balanced.savingsPct = ((parseFloat(scenarios.balanced.savings) / premiumCost) * 100).toFixed(1);
  scenarios.budget.savingsPct = ((parseFloat(scenarios.budget.savings) / premiumCost) * 100).toFixed(1);

  res.json({ scenarios, complexity: complexity.level, requestCount });
});

// ── Replay ───────────────────────────────────────────────────────────────────
app.get('/api/replay/:submissionId', auth, (req, res) => {
  const sub = submissions.find(s => s.id === req.params.submissionId && s.userId === req.user.id);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  res.json({
    submissionId: sub.id,
    steps: sub.nodeResults.map((n, i) => ({
      step: i + 1,
      nodeId: n.nodeId,
      nodeName: n.nodeName,
      model: n.model,
      provider: n.provider,
      complexity: sub.complexity,
      complexityScore: sub.complexityScore,
      routingReason: n.routingReason,
      confidence: n.confidence,
      fallbackChain: n.fallbackChain,
      tokens: { input: n.inputTokens, output: n.outputTokens },
      cost: n.cost,
      latency: n.latency,
      output: n.output,
      savings: n.savings,
    })),
  });
});

// ── Seed demo data ───────────────────────────────────────────────────────────
function seedDemoData() {
  const demoUserId = 'usr_demo';
  const sampleCodes = [
    { name: 'Alice Chen', type: 'Algorithm', code: 'function binarySearch(arr, target) {\n  let left = 0, right = arr.length - 1;\n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}' },
    { name: 'Bob Kumar', type: 'Data Structures', code: 'class LinkedList {\n  constructor() { this.head = null; }\n  append(val) {\n    const node = { val, next: null };\n    if (!this.head) { this.head = node; return; }\n    let curr = this.head;\n    while (curr.next) curr = curr.next;\n    curr.next = node;\n  }\n}' },
    { name: 'Carol Smith', type: 'Dynamic Programming', code: 'function longestCommonSubsequence(text1, text2) {\n  const m = text1.length, n = text2.length;\n  const dp = Array.from({length: m+1}, () => new Array(n+1).fill(0));\n  for (let i = 1; i <= m; i++) {\n    for (let j = 1; j <= n; j++) {\n      if (text1[i-1] === text2[j-1]) dp[i][j] = dp[i-1][j-1] + 1;\n      else dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);\n    }\n  }\n  return dp[m][n];\n}' },
    { name: 'David Lee', type: 'Graph Theory', code: 'x=1' },
    { name: 'Eva Martinez', type: 'System Design', code: 'class EventEmitter {\n  constructor() { this.events = {}; }\n  on(event, listener) {\n    if (!this.events[event]) this.events[event] = [];\n    this.events[event].push(listener);\n    return this;\n  }\n  emit(event, ...args) {\n    if (this.events[event]) this.events[event].forEach(l => l(...args));\n    return this;\n  }\n  off(event, listener) {\n    if (this.events[event]) this.events[event] = this.events[event].filter(l => l !== listener);\n    return this;\n  }\n}' },
  ];

  sampleCodes.forEach((sample, idx) => {
    const submissionId = `sub_demo${idx}`;
    const traceId = `trace_demo${idx}`;
    const complexity = classifyComplexity(sample.code);
    const nodeResults = PIPELINE_NODES.map(node => {
      const model = selectModel(complexity, node.id);
      const exec = simulateNodeExecution(node, model, sample.code);
      return {
        nodeId: node.id, nodeName: node.name, model: model.name, provider: model.provider,
        inputTokens: exec.tokens.input, outputTokens: exec.tokens.output,
        cost: exec.cost, premiumCost: exec.premiumCost, savings: exec.savings,
        latency: exec.latency, status: 'success',
        output: generateNodeResult(node.id, sample.code, complexity.score),
        timestamp: new Date(Date.now() - (5 - idx) * 3600000).toISOString(),
        routingReason: `${complexity.level} complexity → ${model.name}`,
        confidence: 0.85 + Math.random() * 0.1,
        fallbackChain: [MODELS.premium.name, MODELS.balanced.name, MODELS.budget.name],
      };
    });
    const totalCost = nodeResults.reduce((a, n) => a + n.cost, 0);
    const totalPremiumCost = nodeResults.reduce((a, n) => a + n.premiumCost, 0);
    const sub = {
      id: submissionId, traceId, studentName: sample.name, submissionType: sample.type,
      language: 'javascript', code: sample.code, complexity: complexity.level,
      complexityScore: complexity.score, totalCost, totalPremiumCost,
      totalSavings: totalPremiumCost - totalCost,
      savingsPct: ((totalPremiumCost - totalCost) / totalPremiumCost * 100).toFixed(1),
      totalTokens: nodeResults.reduce((a, n) => a + n.inputTokens + n.outputTokens, 0),
      totalLatency: nodeResults.reduce((a, n) => a + n.latency, 0),
      score: Math.floor(complexity.score * 100),
      feedback: nodeResults.find(n => n.nodeId === 'feedback')?.output || '',
      nodeResults, userId: demoUserId,
      timestamp: new Date(Date.now() - (5 - idx) * 3600000).toISOString(),
      status: 'completed',
    };
    submissions.push(sub);
    traces.push({ id: traceId, submissionId, nodes: nodeResults, createdAt: sub.timestamp });
  });
}

seedDemoData();

// ── Python llm-router bridge ─────────────────────────────────────────────────
app.get('/api/llm-router/health', auth, async (req, res) => {
  try {
    const { stdout } = await execAsync('llm-router status', { timeout: 8000 });
    res.json({ available: true, status: stdout.trim() });
  } catch {
    res.json({ available: false, status: 'Python llm-router not found. Install: pip install llm-routing' });
  }
});

app.get('/api/llm-router/stats', auth, async (req, res) => {
  try {
    const r = await fetch(`${PY_DASH}/api/stats${PY_TOKEN ? '?token=' + PY_TOKEN : ''}`, {
      headers: PY_TOKEN ? { 'X-Dashboard-Token': PY_TOKEN } : {},
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) throw new Error();
    res.json(await r.json());
  } catch {
    res.status(503).json({ error: 'Python dashboard not running. Run: llm-router dashboard' });
  }
});

app.get('/api/llm-router/budget', auth, async (req, res) => {
  try {
    const r = await fetch(`${PY_DASH}/api/budget${PY_TOKEN ? '?token=' + PY_TOKEN : ''}`, {
      headers: PY_TOKEN ? { 'X-Dashboard-Token': PY_TOKEN } : {},
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) throw new Error();
    res.json(await r.json());
  } catch {
    res.status(503).json({ error: 'Python dashboard not running. Run: llm-router dashboard' });
  }
});

app.listen(PORT, () => {
  console.log(`RouteIQ Backend running on http://localhost:${PORT}`);
  console.log(`Python bridge → ${PY_DASH} (run 'llm-router dashboard' to enable)`);
});
