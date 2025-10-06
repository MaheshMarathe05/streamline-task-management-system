// Central API client and domain-specific helpers
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function handle(res) {
  const ct = res.headers.get('content-type') || '';
  let body = null;
  if (ct.includes('application/json')) {
    try { body = await res.json(); } catch { body = null; }
  } else {
    body = await res.text();
  }
  if (!res.ok) {
    const err = new Error(body?.error || body?.message || `HTTP ${res.status}`);
    err.status = res.status; err.body = body; throw err;
  }
  return body;
}

export const apiClient = {
  get: (path, params) => {
    const url = new URL(BASE + path);
    if (params) Object.entries(params).forEach(([k,v])=>{ if(v!==undefined&&v!==null&&v!=='') url.searchParams.append(k,v); });
    return fetch(url, { headers: authHeaders() }).then(handle);
  },
  post: (path, data) => fetch(BASE + path, { method:'POST', headers: authHeaders(), body: JSON.stringify(data) }).then(handle),
  put: (path, data) => fetch(BASE + path, { method:'PUT', headers: authHeaders(), body: JSON.stringify(data) }).then(handle),
  del: (path) => fetch(BASE + path, { method:'DELETE', headers: authHeaders() }).then(handle)
};

export const projectsApi = {
  list: (filters) => apiClient.get('/projects', filters),
  get: (id) => apiClient.get(`/projects/${id}`),
  tasks: (id) => apiClient.get(`/projects/${id}/tasks`),
  analytics: (id) => apiClient.get(`/projects/${id}/analytics`),
  comment: (id, text) => apiClient.post(`/projects/${id}/comments`, { text })
};

export const tasksApi = {
  update: (id, data) => apiClient.put(`/tasks/${id}`, data)
};
