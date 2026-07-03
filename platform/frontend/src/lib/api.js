const BASE = '/api';

function getToken() { return localStorage.getItem('token'); }

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password, name) => request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  me: () => request('/auth/me'),
  stats: () => request('/dashboard/stats'),
  submit: (data) => request('/pipeline/submit', { method: 'POST', body: JSON.stringify(data) }),
  submissions: (page = 1) => request(`/submissions?page=${page}&limit=10`),
  submission: (id) => request(`/submissions/${id}`),
  traces: () => request('/traces'),
  trace: (id) => request(`/traces/${id}`),
  analytics: () => request('/analytics'),
  simulate: (data) => request('/simulator', { method: 'POST', body: JSON.stringify(data) }),
  replay: (id) => request(`/replay/${id}`),
  llmHealth: () => request('/llm-router/health'),
  llmStats: () => request('/llm-router/stats'),
  llmBudget: () => request('/llm-router/budget'),
};
