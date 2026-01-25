import { useState, useMemo, useCallback } from 'react'
import { api } from '../../services/api'
import './HistoryPlaylistFolder.css'

function HistoryPlaylistFolder({
  playlist,
  onRedownload,
  onDownloadFile,
  selectable = false,
  selectedItems = new Set(),
  onSelect,
  formatDate
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Calculate stats
  const stats = useMemo(() => {
    const completed = playlist.items.filter(item => item.status === 'completed').length
    const errors = playlist.items.filter(item => item.status === 'error').length
    const total = playlist.items.length
    return { completed, errors, total }
  }, [playlist.items])

  // Get downloadable items
  const downloadableItems = useMemo(() =>
    playlist.items.filter(item => item.status === 'completed' && (item.filePath || item.file_path)),
    [playlist.items]
  )

  // Check if all downloadable items in this playlist are selected
  const allSelected = useMemo(() => {
    if (downloadableItems.length === 0) return false
    return downloadableItems.every(item => selectedItems.has(item.id))
  }, [downloadableItems, selectedItems])

  // Handle select all in playlist
  const handleSelectAllInPlaylist = useCallback((e) => {
    e.stopPropagation()
    downloadableItems.forEach(item => {
      if (allSelected) {
        if (selectedItems.has(item.id)) {
          onSelect(item.id)
        }
      } else {
        if (!selectedItems.has(item.id)) {
          onSelect(item.id)
        }
      }
    })
  }, [downloadableItems, allSelected, selectedItems, onSelect])

  // Handle download all
  const handleDownloadAll = useCallback((e) => {
    e.stopPropagation()
    downloadableItems.forEach((item, index) => {
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
        }, index * 500)
      }
    })
  }, [downloadableItems])

  // Most recent date
  const latestDate = useMemo(() => {
    const dates = playlist.items
      .map(item => item.completedAt || item.createdAt)
      .filter(Boolean)
      .map(d => new Date(d))
    if (dates.length === 0) return null
    return new Date(Math.max(...dates))
  }, [playlist.items])

  return (
    <div className="history-playlist-folder">
      <div
        className="history-playlist-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="history-playlist-left">
          <span className={`folder-icon ${isExpanded ? 'open' : ''}`}></span>
          <div className="history-playlist-info">
            <h4 className="history-playlist-name">{playlist.name}</h4>
            <div className="history-playlist-meta">
              <span className="history-playlist-count">
                {stats.total} musica{stats.total !== 1 ? 's' : ''}
              </span>
              <div className="history-playlist-stats">
                {stats.completed > 0 && (
                  <span className="stat-tag stat-completed">{stats.completed} concluido{stats.completed !== 1 ? 's' : ''}</span>
                )}
                {stats.errors > 0 && (
                  <span className="stat-tag stat-error">{stats.errors} erro{stats.errors !== 1 ? 's' : ''}</span>
                )}
              </div>
              {latestDate && (
                <span className="history-playlist-date">{formatDate(latestDate)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="history-playlist-right">
          {selectable && downloadableItems.length > 0 && (
            <button
              className="playlist-action-btn playlist-btn-select"
              onClick={handleSelectAllInPlaylist}
              title={allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
            >
              {allSelected ? 'Desmarcar' : 'Selecionar'}
            </button>
          )}
          {downloadableItems.length > 0 && (
            <button
              className="playlist-action-btn playlist-btn-download"
              onClick={handleDownloadAll}
              title="Baixar todas as musicas"
            >
              Baixar Todas
            </button>
          )}
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}></span>
        </div>
      </div>

      {isExpanded && (
        <div className="history-playlist-items">
          {playlist.items.map(item => {
            const filePath = item.filePath || item.file_path
            const isDownloadable = item.status === 'completed' && filePath
            const isSelected = selectedItems.has(item.id)

            return (
              <div key={item.id} className={`history-playlist-item ${isSelected ? 'item-selected' : ''}`}>
                {selectable && isDownloadable && (
                  <div className="item-checkbox">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelect(item.id)}
                      className="select-checkbox"
                    />
                  </div>
                )}
                <div className="item-content">
                  <span className="item-title" title={item.title || item.url}>
                    {item.title || item.url}
                  </span>
                  <div className="item-meta">
                    <span className={`item-badge item-badge-${item.status}`}>
                      {item.status === 'completed' ? 'OK' : 'Erro'}
                    </span>
                    {item.completedAt && (
                      <span className="item-date">{formatDate(item.completedAt)}</span>
                    )}
                  </div>
                </div>
                <div className="item-actions">
                  {isDownloadable && (
                    <button
                      className="item-btn item-btn-download"
                      onClick={() => onDownloadFile(filePath.split('/').pop())}
                      title="Baixar"
                    >
                      <span className="btn-icon btn-icon-download"></span>
                    </button>
                  )}
                  <button
                    className="item-btn item-btn-redownload"
                    onClick={() => onRedownload(item.url)}
                    title="Baixar novamente"
                  >
                    <span className="btn-icon btn-icon-refresh"></span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default HistoryPlaylistFolder
