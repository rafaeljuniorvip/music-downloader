import { useState, useMemo, useCallback } from 'react'
import QueueItem from '../QueueItem/QueueItem'
import PlaylistFolder from '../PlaylistFolder/PlaylistFolder'
import { api } from '../../services/api'
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

const DATE_OPTIONS = [
  { value: 'all', label: 'Todas as datas' },
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'week', label: 'Última semana' },
  { value: 'month', label: 'Último mês' },
  { value: 'custom', label: 'Personalizado' }
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
  const [dateFilter, setDateFilter] = useState('all')
  const [customDateStart, setCustomDateStart] = useState('')
  const [customDateEnd, setCustomDateEnd] = useState('')
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

  // Filter items based on search, status, and date
  const filteredItems = useMemo(() => {
    if (!items || items.length === 0) return []

    return items.filter(item => {
      const matchesSearch = !searchQuery ||
        (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter

      const matchesDate = dateMatchesFilter(item.createdAt)

      return matchesSearch && matchesStatus && matchesDate
    })
  }, [items, searchQuery, statusFilter, dateMatchesFilter])

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

  // Group items by playlist
  const groupByPlaylist = useCallback((itemsList) => {
    const playlists = new Map()
    const singles = []

    itemsList.forEach(item => {
      if (item.playlistId) {
        if (!playlists.has(item.playlistId)) {
          playlists.set(item.playlistId, {
            id: item.playlistId,
            name: item.playlistName || 'Playlist',
            items: []
          })
        }
        playlists.get(item.playlistId).items.push(item)
      } else {
        singles.push(item)
      }
    })

    return {
      playlists: Array.from(playlists.values()),
      singles
    }
  }, [])

  const activeGrouped = useMemo(() => groupByPlaylist(activeItems), [activeItems, groupByPlaylist])
  const completedGrouped = useMemo(() => groupByPlaylist(completedItems), [completedItems, groupByPlaylist])
  const errorGrouped = useMemo(() => groupByPlaylist(errorItems), [errorItems, groupByPlaylist])

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
    const completedIds = completedItems.map(item => item.id)
    const allSelected = completedIds.every(id => selectedItems.has(id))

    if (allSelected) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(completedIds))
    }
  }, [completedItems, selectedItems])

  const handleDownloadSelected = useCallback(() => {
    const selectedCompleted = completedItems.filter(item => selectedItems.has(item.id))

    // Download each selected file with a small delay to avoid browser blocking
    selectedCompleted.forEach((item, index) => {
      if (item.filePath) {
        const filename = item.filePath.split('/').pop()
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
  }, [completedItems, selectedItems])

  const toggleSelectMode = useCallback(() => {
    setSelectMode(prev => !prev)
    if (selectMode) {
      setSelectedItems(new Set())
    }
  }, [selectMode])

  const selectedCount = selectedItems.size
  const allCompletedSelected = completedItems.length > 0 &&
    completedItems.every(item => selectedItems.has(item.id))

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
        <div className="toolbar-row">
          <div className="toolbar-search">
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por título..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="toolbar-filters">
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

            <select
              className="date-filter"
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
                Até:
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
            {completedItems.length > 0 && (
              <button
                className={`toolbar-btn toolbar-btn-select ${selectMode ? 'active' : ''}`}
                onClick={toggleSelectMode}
                title="Modo de seleção"
              >
                {selectMode ? 'Cancelar Seleção' : 'Selecionar'}
              </button>
            )}

            {selectMode && completedItems.length > 0 && (
              <>
                <button
                  className="toolbar-btn toolbar-btn-select-all"
                  onClick={handleSelectAll}
                  title={allCompletedSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                >
                  {allCompletedSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
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
      </div>

      {/* Results count */}
      <div className="queue-results-count">
        Mostrando {filteredItems.length} de {items.length} itens
        {searchQuery && ` (filtro: "${searchQuery}")`}
        {statusFilter !== 'all' && ` (status: ${STATUS_OPTIONS.find(o => o.value === statusFilter)?.label})`}
        {dateFilter !== 'all' && ` (data: ${DATE_OPTIONS.find(o => o.value === dateFilter)?.label})`}
        {selectMode && selectedCount > 0 && ` - ${selectedCount} selecionado(s)`}
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
                {/* Playlists em andamento */}
                {activeGrouped.playlists.map(playlist => (
                  <PlaylistFolder
                    key={playlist.id}
                    playlist={playlist}
                    onPauseResume={onPauseResume}
                    onCancel={onCancel}
                    onRetry={onRetry}
                    selectable={false}
                  />
                ))}
                {/* Videos avulsos em andamento */}
                {activeGrouped.singles.map(item => (
                  <QueueItem
                    key={item.id}
                    item={item}
                    onPauseResume={onPauseResume}
                    onCancel={onCancel}
                    onRetry={onRetry}
                    selectable={false}
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
                {/* Playlists concluidas */}
                {completedGrouped.playlists.map(playlist => (
                  <PlaylistFolder
                    key={playlist.id}
                    playlist={playlist}
                    onPauseResume={onPauseResume}
                    onCancel={onCancel}
                    onRetry={onRetry}
                    selectable={selectMode}
                    selectedItems={selectedItems}
                    onSelect={handleSelect}
                  />
                ))}
                {/* Videos avulsos concluidos */}
                {completedGrouped.singles.map(item => (
                  <QueueItem
                    key={item.id}
                    item={item}
                    onPauseResume={onPauseResume}
                    onCancel={onCancel}
                    onRetry={onRetry}
                    selectable={selectMode}
                    selected={selectedItems.has(item.id)}
                    onSelect={handleSelect}
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
                {/* Playlists com erro */}
                {errorGrouped.playlists.map(playlist => (
                  <PlaylistFolder
                    key={playlist.id}
                    playlist={playlist}
                    onPauseResume={onPauseResume}
                    onCancel={onCancel}
                    onRetry={onRetry}
                    selectable={false}
                  />
                ))}
                {/* Videos avulsos com erro */}
                {errorGrouped.singles.map(item => (
                  <QueueItem
                    key={item.id}
                    item={item}
                    onPauseResume={onPauseResume}
                    onCancel={onCancel}
                    onRetry={onRetry}
                    selectable={false}
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
