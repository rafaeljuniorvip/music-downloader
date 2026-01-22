import './QueueItem.css'
import { api } from '../../services/api'

function QueueItem({ item, onPauseResume, onCancel, onRetry, selectable, selected, onSelect }) {
  const { id, title, status, progress = 0, error, filePath, url, createdAt } = item

  // Extrai o nome do arquivo do caminho completo
  const filename = filePath ? filePath.split('/').pop() : null

  const statusLabels = {
    waiting: 'Aguardando',
    downloading: 'Baixando',
    paused: 'Pausado',
    completed: 'Concluido',
    error: 'Erro'
  }

  const handleDownloadFile = () => {
    if (filename) {
      window.open(api.getDownloadUrl(filename), '_blank')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const displayTitle = title || url || 'Carregando informacoes...'

  return (
    <div className={`queue-item queue-item-${status} ${selected ? 'queue-item-selected' : ''}`}>
      <div className="item-content">
        {selectable && status === 'completed' && (
          <div className="item-checkbox">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect(id)}
              className="select-checkbox"
            />
          </div>
        )}

        <div className="item-info">
          <h4 className="item-title" title={displayTitle}>
            {displayTitle}
          </h4>
          <div className="item-meta">
            <span className={`status-badge status-${status}`}>
              {statusLabels[status] || status}
            </span>
            {createdAt && (
              <span className="item-date">{formatDate(createdAt)}</span>
            )}
            {error && <span className="error-text">{error}</span>}
          </div>
        </div>

        <div className="item-actions">
          {status === 'downloading' && (
            <button
              className="action-btn action-pause"
              onClick={() => onPauseResume(id, status)}
              title="Pausar"
            >
              <span className="action-icon icon-pause"></span>
            </button>
          )}

          {status === 'paused' && (
            <button
              className="action-btn action-resume"
              onClick={() => onPauseResume(id, status)}
              title="Continuar"
            >
              <span className="action-icon icon-play"></span>
            </button>
          )}

          {status === 'error' && (
            <button
              className="action-btn action-retry"
              onClick={() => onRetry(id)}
              title="Tentar novamente"
            >
              <span className="action-icon icon-retry"></span>
            </button>
          )}

          {status === 'completed' && (
            <button
              className="action-btn action-download"
              onClick={handleDownloadFile}
              title="Baixar arquivo"
            >
              <span className="action-icon icon-download"></span>
            </button>
          )}

          {(status === 'waiting' || status === 'downloading' || status === 'paused') && (
            <button
              className="action-btn action-cancel"
              onClick={() => onCancel(id)}
              title="Cancelar"
            >
              <span className="action-icon icon-cancel"></span>
            </button>
          )}
        </div>
      </div>

      {(status === 'downloading' || status === 'paused') && (
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className={`progress-fill progress-fill-${status}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="progress-text">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  )
}

export default QueueItem
