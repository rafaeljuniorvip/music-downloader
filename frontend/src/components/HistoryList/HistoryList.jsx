import { useState, useMemo } from 'react'
import './HistoryList.css'

function HistoryList({ items, onRedownload, onClearHistory }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')

  const filteredItems = useMemo(() => {
    let result = [...(items || [])]

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(item =>
        (item.title && item.title.toLowerCase().includes(term)) ||
        (item.url && item.url.toLowerCase().includes(term))
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(item => item.status === statusFilter)
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'date') {
        comparison = new Date(a.completedAt || a.createdAt) - new Date(b.completedAt || b.createdAt)
      } else if (sortBy === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '')
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [items, searchTerm, statusFilter, sortBy, sortOrder])

  const handleDownloadFile = (filename) => {
    if (filename) {
      window.open(`/api/files/${encodeURIComponent(filename)}`, '_blank')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  if (!items || items.length === 0) {
    return (
      <div className="history-empty">
        <div className="empty-icon"></div>
        <h3 className="empty-title">Historico vazio</h3>
        <p className="empty-description">
          Os downloads concluidos aparecerao aqui
        </p>
      </div>
    )
  }

  return (
    <div className="history-container">
      <div className="history-toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <span className="search-icon"></span>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar no historico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos os status</option>
            <option value="completed">Concluidos</option>
            <option value="error">Com erro</option>
          </select>
        </div>
        <div className="toolbar-right">
          <span className="results-count">
            {filteredItems.length} registro{filteredItems.length !== 1 ? 's' : ''}
          </span>
          <button
            className="clear-btn"
            onClick={onClearHistory}
            title="Limpar historico"
          >
            Limpar historico
          </button>
        </div>
      </div>

      <div className="history-table-wrapper">
        <table className="history-table">
          <thead>
            <tr>
              <th
                className={`sortable ${sortBy === 'title' ? 'sorted' : ''}`}
                onClick={() => toggleSort('title')}
              >
                Titulo
                <span className={`sort-icon ${sortOrder}`}></span>
              </th>
              <th>Status</th>
              <th
                className={`sortable ${sortBy === 'date' ? 'sorted' : ''}`}
                onClick={() => toggleSort('date')}
              >
                Data
                <span className={`sort-icon ${sortOrder}`}></span>
              </th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id}>
                <td className="title-cell">
                  <span className="cell-title" title={item.title || item.url}>
                    {item.title || item.url}
                  </span>
                </td>
                <td>
                  <span className={`table-badge table-badge-${item.status}`}>
                    {item.status === 'completed' ? 'Concluido' : 'Erro'}
                  </span>
                </td>
                <td className="date-cell">
                  {formatDate(item.completedAt || item.createdAt)}
                </td>
                <td className="actions-cell">
                  {item.status === 'completed' && (item.file_path || item.filePath) && (
                    <button
                      className="table-btn table-btn-download"
                      onClick={() => handleDownloadFile((item.file_path || item.filePath).split('/').pop())}
                      title="Baixar arquivo"
                    >
                      Baixar
                    </button>
                  )}
                  <button
                    className="table-btn table-btn-redownload"
                    onClick={() => onRedownload(item.url)}
                    title="Baixar novamente"
                  >
                    Re-baixar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredItems.length === 0 && (items.length > 0) && (
        <div className="no-results">
          <p>Nenhum resultado encontrado para os filtros aplicados</p>
        </div>
      )}
    </div>
  )
}

export default HistoryList
