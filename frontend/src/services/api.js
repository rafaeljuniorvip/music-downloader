// Em producao usa o subdominio da API, em dev usa proxy do Vite
const API_BASE = import.meta.env.PROD
  ? 'https://api.downytube.papelaria.vip/api'
  : '/api'

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  }

  const response = await fetch(url, config)

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
  getStreamUrl: (videoId) => `${API_BASE}/stream/${videoId}`
}

export default api
