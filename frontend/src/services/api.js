// Em producao usa o subdominio da API, em dev usa proxy do Vite
const API_BASE = import.meta.env.PROD
  ? 'https://api.downytube.papelaria.vip/api'
  : '/api'

const TOKEN_KEY = 'music-downloader-token'

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  const token = getToken()

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    ...options
  }

  const response = await fetch(url, config)

  if (response.status === 401) {
    // Token expired or invalid - clear and redirect to login
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('music-downloader-user')
    window.location.reload()
    throw new Error('Sessao expirada')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(error.error || `HTTP Error: ${response.status}`)
  }

  return response.json()
}

export const api = {
  // Queue operations
  getQueue: () => request('/download/queue'),

  addDownload: (url, type = 'video') =>
    request('/download/add', {
      method: 'POST',
      body: JSON.stringify({ url, type })
    }),

  pauseDownload: (id) =>
    request(`/download/${id}/pause`, {
      method: 'POST'
    }),

  resumeDownload: (id) =>
    request(`/download/${id}/resume`, {
      method: 'POST'
    }),

  cancelDownload: (id) =>
    request(`/download/${id}`, {
      method: 'DELETE'
    }),

  retryDownload: (id) =>
    request(`/download/${id}/retry`, {
      method: 'POST'
    }),

  clearCompleted: () =>
    request('/download/clear-completed', {
      method: 'POST'
    }),

  pauseAll: () =>
    request('/download/pause-all', {
      method: 'POST'
    }),

  resumeAll: () =>
    request('/download/resume-all', {
      method: 'POST'
    }),

  // History operations
  getHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/history${query ? `?${query}` : ''}`)
  },

  deleteHistoryItem: (id) =>
    request(`/history/${id}`, {
      method: 'DELETE'
    }),

  clearHistory: () =>
    request('/history', {
      method: 'DELETE'
    }),

  // Get download file URL
  getDownloadUrl: (filename) => `${API_BASE}/files/${encodeURIComponent(filename)}`,

  // Health check
  healthCheck: () => request('/health'),

  // Settings operations
  getSettings: () => request('/settings'),

  updateSettings: (settings) =>
    request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }),

  resetSettings: () =>
    request('/settings/reset', {
      method: 'POST'
    }),

  // Statistics operations
  getStatistics: () => request('/statistics'),

  getStatisticsSummary: () => request('/statistics/summary'),

  // Search operations
  searchYouTube: (query, limit = 12, page = 1) => {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      page: page.toString()
    }).toString()
    return request(`/search?${params}`)
  },

  // Stream operations
  getStreamUrl: (videoId) => `${API_BASE}/stream/${videoId}`,

  // Auth operations
  googleLogin: (credential) =>
    request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential })
    }),

  getMe: () => request('/auth/me'),

  // Users operations (admin)
  getUsers: () => request('/users'),

  approveUser: (id) =>
    request(`/users/${id}/approve`, { method: 'POST' }),

  deleteUser: (id) =>
    request(`/users/${id}`, { method: 'DELETE' }),

  updateUserRole: (id, role) =>
    request(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    }),

  // API Keys operations (admin)
  getApiKeys: () => request('/api-keys'),

  createApiKey: (name) =>
    request('/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name })
    }),

  revokeApiKey: (id) =>
    request(`/api-keys/${id}`, { method: 'DELETE' })
}

export default api
