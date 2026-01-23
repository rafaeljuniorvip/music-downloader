import { useState, useMemo } from 'react'
import QueueItem from '../QueueItem/QueueItem'
import { api } from '../../services/api'
import './PlaylistFolder.css'

function PlaylistFolder({
  playlist,
  onPauseResume,
  onCancel,
  onRetry,
  selectable = false,
  selectedItems = new Set(),
  onSelect
}) {
  const [isExpanded, setIsExpanded] = useState(true)

  const { id, name, items } = playlist

  // Calcula progresso geral da playlist
  const overallProgress = useMemo(() => {
    if (!items || items.length === 0) return 0
    const totalProgress = items.reduce((sum, item) => {
      if (item.status === 'completed') return sum + 100
      return sum + (item.progress || 0)
    }, 0)
    return Math.round(totalProgress / items.length)
  }, [items])

  // Conta status dos itens
  const statusCounts = useMemo(() => {
    const counts = {
      completed: 0,
      downloading: 0,
      pending: 0,
      paused: 0,
      error: 0
    }
    items.forEach(item => {
      if (item.status === 'completed') counts.completed++
      else if (item.status === 'downloading' || item.status === 'waiting') counts.downloading++
      else if (item.status === 'pending') counts.pending++
      else if (item.status === 'paused') counts.paused++
      else if (item.status === 'error' || item.status === 'cancelled') counts.error++
    })
    return counts
  }, [items])

  // Verifica se todos os itens estao selecionados
  const allSelected = useMemo(() => {
    if (!selectable || items.length === 0) return false
    return items.every(item => selectedItems.has(item.id))
  }, [selectable, items, selectedItems])

  // Seleciona/deseleciona todos os itens da playlist
  const handleSelectAll = () => {
    if (allSelected) {
      items.forEach(item => onSelect(item.id))
    } else {
      items.forEach(item => {
        if (!selectedItems.has(item.id)) {
          onSelect(item.id)
        }
      })
    }
  }

  // Baixa todos os arquivos completados da playlist
  const handleDownloadAll = () => {
    const completedItems = items.filter(item => item.status === 'completed' && item.filePath)
    completedItems.forEach((item, index) => {
      const filename = item.filePath.split('/').pop()
      setTimeout(() => {
        const link = document.createElement('a')
        link.href = api.getDownloadUrl(filename)
        link.download = filename
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }, index * 500)
    })
  }

  const hasCompletedItems = statusCounts.completed > 0

  return (
    <div className="playlist-folder">
      <div
        className={`playlist-header ${isExpanded ? 'expanded' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="playlist-header-left">
          <span className={`folder-icon ${isExpanded ? 'open' : ''}`}></span>
          <div className="playlist-info">
            <h4 className="playlist-name">{name}</h4>
            <div className="playlist-meta">
              <span className="playlist-count">{items.length} musicas</span>
              <span className="playlist-status">
                {statusCounts.completed > 0 && (
                  <span className="status-tag status-completed">{statusCounts.completed} concluido{statusCounts.completed > 1 ? 's' : ''}</span>
                )}
                {statusCounts.downloading > 0 && (
                  <span className="status-tag status-downloading">{statusCounts.downloading} baixando</span>
                )}
                {statusCounts.pending > 0 && (
                  <span className="status-tag status-pending">{statusCounts.pending} pendente{statusCounts.pending > 1 ? 's' : ''}</span>
                )}
                {statusCounts.paused > 0 && (
                  <span className="status-tag status-paused">{statusCounts.paused} pausado{statusCounts.paused > 1 ? 's' : ''}</span>
                )}
                {statusCounts.error > 0 && (
                  <span className="status-tag status-error">{statusCounts.error} erro{statusCounts.error > 1 ? 's' : ''}</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="playlist-header-right" onClick={(e) => e.stopPropagation()}>
          {overallProgress > 0 && overallProgress < 100 && (
            <div className="playlist-progress">
              <div className="progress-bar-mini">
                <div className="progress-fill-mini" style={{ width: `${overallProgress}%` }}></div>
              </div>
              <span className="progress-text-mini">{overallProgress}%</span>
            </div>
          )}

          {selectable && (
            <button
              className="playlist-btn playlist-btn-select"
              onClick={handleSelectAll}
              title={allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
            >
              {allSelected ? 'Desmarcar' : 'Selecionar'}
            </button>
          )}

          {hasCompletedItems && (
            <button
              className="playlist-btn playlist-btn-download"
              onClick={handleDownloadAll}
              title="Baixar todos os concluidos"
            >
              Baixar Todos
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="playlist-items">
          {items.map(item => (
            <QueueItem
              key={item.id}
              item={item}
              onPauseResume={onPauseResume}
              onCancel={onCancel}
              onRetry={onRetry}
              selectable={selectable && item.status === 'completed'}
              selected={selectedItems.has(item.id)}
              onSelect={onSelect}
              compact={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default PlaylistFolder
