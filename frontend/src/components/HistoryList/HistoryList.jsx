import { useState, useMemo, useCallback } from 'react'
import './HistoryList.css'
import { api } from '../../services/api'

const DATE_OPTIONS = [
  { value: 'all', label: 'Todas as datas' },
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'week', label: 'Ultima semana' },
  { value: 'month', label: 'Ultimo mes' },
  { value: 'custom', label: 'Personalizado' }
]

function HistoryList({ items, onRedownload, onClearHistory }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [customDateStart, setCustomDateStart] = useState('')
  const [customDateEnd, setCustomDateEnd] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [selectMode, setSelectMode] = useState(false)

  // Helper function to check if date matches filter
  const dateMatchesFilter = useCallback((dateString) => {
    if (!dateString) return true
    if (dateFilter === 'all') return true

    const itemDate = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const monthAgo = new Date(today)
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    switch (dateFilter) {
      case 'today':
        return itemDate >= today
      case 'yesterday':
        return itemDate >= yesterday && itemDate < today
      case 'week':
        return itemDate >= weekAgo
      case 'month':
        return itemDate >= monthAgo
      case 'custom':
        const startDate = customDateStart ? new Date(customDateStart) : null
        const endDate = customDateEnd ? new Date(customDateEnd + 'T23:59:59') : null
        if (startDate && endDate) {
          return itemDate >= startDate && itemDate <= endDate
        } else if (startDate) {
          return itemDate >= startDate
        } else if (endDate) {
          return itemDate <= endDate
        }
        return true
      default:
        return true
    }
  }, [dateFilter, customDateStart, customDateEnd])

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

    // Filter by date
    result = result.filter(item => dateMatchesFilter(item.completedAt || item.createdAt))

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
  }, [items, searchTerm, statusFilter, dateMatchesFilter, sortBy, sortOrder])

  // Itens que podem ser baixados (status completed com filePath)
  const downloadableItems = useMemo(() =>
    filteredItems.filter(item => item.status === 'completed' && (item.filePath || item.file_path)),
    [filteredItems]
  )

  const handleDownloadFile = (filename) => {
    if (filename) {
      window.open(api.getDownloadUrl(filename), '_blank')
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

  // Selection handlers
  const handleSelect = useCallback((id) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    const downloadableIds = downloadableItems.map(item => item.id)
    const allSelected = downloadableIds.every(id => selectedItems.has(id))

    if (allSelected) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(downloadableIds))
    }
  }, [downloadableItems, selectedItems])

  const handleDownloadSelected = useCallback(() => {
    const selectedDownloadable = downloadableItems.filter(item => selectedItems.has(item.id))

    // Download each selected file with a small delay to avoid browser blocking
    selectedDownloadable.forEach((item, index) => {
      const filePath = item.filePath || item.file_path
      if (filePath) {
        const filename = filePath.split('/').pop()
        setTimeout(() => {
          const link = document.createElement('a')
          link.href = api.getDownloadUrl(filename)
          link.download = filename
          link.target = '_blank'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }, index * 500) // 500ms delay between downloads
      }
    })
  }, [downloadableItems, selectedItems])

  const toggleSelectMode = useCallback(() => {
    setSelectMode(prev => !prev)
    if (selectMode) {
      setSelectedItems(new Set())
    }
  }, [selectMode])

  const selectedCount = selectedItems.size
  const allDownloadableSelected = downloadableItems.length > 0 &&
    downloadableItems.every(item => selectedItems.has(item.id))

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
        <div className="toolbar-row">
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

          <div className="toolbar-filters">
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos os status</option>
              <option value="completed">Concluidos</option>
              <option value="error">Com erro</option>
            </select>

            <select
              className="filter-select date-filter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              {DATE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom date range */}
        {dateFilter === 'custom' && (
          <div className="toolbar-row date-range-row">
            <div className="date-range-inputs">
              <label>
                De:
                <input
                  type="date"
                  className="date-input"
                  value={customDateStart}
                  onChange={(e) => setCustomDateStart(e.target.value)}
                />
              </label>
              <label>
                Ate:
                <input
                  type="date"
                  className="date-input"
                  value={customDateEnd}
                  onChange={(e) => setCustomDateEnd(e.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        <div className="toolbar-row toolbar-actions-row">
          <div className="toolbar-actions-left">
            {downloadableItems.length > 0 && (
              <button
                className={`toolbar-btn toolbar-btn-select ${selectMode ? 'active' : ''}`}
                onClick={toggleSelectMode}
                title="Modo de selecao"
              >
                {selectMode ? 'Cancelar Selecao' : 'Selecionar'}
              </button>
            )}

            {selectMode && downloadableItems.length > 0 && (
              <>
                <button
                  className="toolbar-btn toolbar-btn-select-all"
                  onClick={handleSelectAll}
                  title={allDownloadableSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                >
                  {allDownloadableSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>

                {selectedCount > 0 && (
                  <button
                    className="toolbar-btn toolbar-btn-download-all"
                    onClick={handleDownloadSelected}
                    title={`Baixar ${selectedCount} arquivo(s)`}
                  >
                    Baixar {selectedCount} Selecionado{selectedCount > 1 ? 's' : ''}
                  </button>
                )}
              </>
            )}
          </div>

          <div className="toolbar-actions-right">
            <span className="results-count">
              {filteredItems.length} registro{filteredItems.length !== 1 ? 's' : ''}
              {selectMode && selectedCount > 0 && ` - ${selectedCount} selecionado(s)`}
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
      </div>

      <div className="history-table-wrapper">
        <table className="history-table">
          <thead>
            <tr>
              {selectMode && <th className="checkbox-col"></th>}
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
            {filteredItems.map(item => {
              const filePath = item.filePath || item.file_path
              const isDownloadable = item.status === 'completed' && filePath
              const isSelected = selectedItems.has(item.id)

              return (
                <tr key={item.id} className={isSelected ? 'row-selected' : ''}>
                  {selectMode && (
                    <td className="checkbox-col">
                      {isDownloadable && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelect(item.id)}
                          className="select-checkbox"
                        />
                      )}
                    </td>
                  )}
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
                    {isDownloadable && (
                      <button
                        className="table-btn table-btn-download"
                        onClick={() => handleDownloadFile(filePath.split('/').pop())}
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
              )
            })}
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
