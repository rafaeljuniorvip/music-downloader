import { useState, useMemo } from 'react'
import QueueItem from '../QueueItem/QueueItem'
import './QueueList.css'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendente' },
  { value: 'downloading', label: 'Baixando' },
  { value: 'paused', label: 'Pausado' },
  { value: 'completed', label: 'Concluído' },
  { value: 'error', label: 'Erro' },
  { value: 'cancelled', label: 'Cancelado' }
]

function QueueList({
  items,
  onPauseResume,
  onCancel,
  onRetry,
  onClearCompleted,
  onPauseAll,
  onResumeAll
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Filter items based on search and status
  const filteredItems = useMemo(() => {
    if (!items || items.length === 0) return []

    return items.filter(item => {
      const matchesSearch = !searchQuery ||
        (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [items, searchQuery, statusFilter])

  // Check if there are pausable/resumable items
  const hasDownloading = useMemo(() =>
    items?.some(item => item.status === 'downloading' || item.status === 'waiting'),
    [items]
  )

  const hasPaused = useMemo(() =>
    items?.some(item => item.status === 'paused'),
    [items]
  )

  const hasCompleted = useMemo(() =>
    items?.some(item => ['completed', 'error', 'cancelled'].includes(item.status)),
    [items]
  )

  // Group filtered items by status
  const activeItems = filteredItems.filter(item =>
    item.status === 'downloading' || item.status === 'waiting' || item.status === 'paused' || item.status === 'pending'
  )
  const completedItems = filteredItems.filter(item => item.status === 'completed')
  const errorItems = filteredItems.filter(item => item.status === 'error' || item.status === 'cancelled')

  if (!items || items.length === 0) {
    return (
      <div className="queue-empty">
        <div className="empty-icon"></div>
        <h3 className="empty-title">Fila vazia</h3>
        <p className="empty-description">
          Adicione uma URL do YouTube para comecar a baixar musicas
        </p>
      </div>
    )
  }

  return (
    <div className="queue-container">
      {/* Toolbar with search and filters */}
      <div className="queue-toolbar">
        <div className="toolbar-search">
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="toolbar-filter">
          <select
            className="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="toolbar-actions">
          {hasPaused && onResumeAll && (
            <button
              className="toolbar-btn toolbar-btn-resume"
              onClick={onResumeAll}
              title="Retomar todos os downloads pausados"
            >
              Retomar Todos
            </button>
          )}

          {hasDownloading && onPauseAll && (
            <button
              className="toolbar-btn toolbar-btn-pause"
              onClick={onPauseAll}
              title="Pausar todos os downloads em andamento"
            >
              Pausar Todos
            </button>
          )}

          {hasCompleted && onClearCompleted && (
            <button
              className="toolbar-btn toolbar-btn-clear"
              onClick={onClearCompleted}
              title="Limpar itens concluídos, com erro ou cancelados"
            >
              Limpar Concluídos
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="queue-results-count">
        Mostrando {filteredItems.length} de {items.length} itens
        {searchQuery && ` (filtro: "${searchQuery}")`}
        {statusFilter !== 'all' && ` (status: ${STATUS_OPTIONS.find(o => o.value === statusFilter)?.label})`}
      </div>

      {/* Queue list */}
      {filteredItems.length === 0 ? (
        <div className="queue-no-results">
          <p>Nenhum item encontrado com os filtros selecionados.</p>
        </div>
      ) : (
        <div className="queue-list">
          {activeItems.length > 0 && (
            <div className="queue-section">
              <h3 className="section-title">
                Em andamento ({activeItems.length})
              </h3>
              <div className="queue-items">
                {activeItems.map(item => (
                  <QueueItem
                    key={item.id}
                    item={item}
                    onPauseResume={onPauseResume}
                    onCancel={onCancel}
                    onRetry={onRetry}
                  />
                ))}
              </div>
            </div>
          )}

          {completedItems.length > 0 && (
            <div className="queue-section">
              <h3 className="section-title">
                Concluidos ({completedItems.length})
              </h3>
              <div className="queue-items">
                {completedItems.map(item => (
                  <QueueItem
                    key={item.id}
                    item={item}
                    onPauseResume={onPauseResume}
                    onCancel={onCancel}
                    onRetry={onRetry}
                  />
                ))}
              </div>
            </div>
          )}

          {errorItems.length > 0 && (
            <div className="queue-section">
              <h3 className="section-title section-title-error">
                Com erro ({errorItems.length})
              </h3>
              <div className="queue-items">
                {errorItems.map(item => (
                  <QueueItem
                    key={item.id}
                    item={item}
                    onPauseResume={onPauseResume}
                    onCancel={onCancel}
                    onRetry={onRetry}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default QueueList
