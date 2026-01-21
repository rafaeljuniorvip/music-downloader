import './SearchPage.css'

/**
 * Formata a duracao de segundos para formato MM:SS ou HH:MM:SS
 * @param {number} seconds - Duracao em segundos
 * @returns {string} Duracao formatada
 */
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Formata numero de visualizacoes no formato pt-BR
 * @param {number} count - Numero de visualizacoes
 * @returns {string} Numero formatado
 */
function formatViewCount(count) {
  if (!count || isNaN(count)) return '0 visualizacoes'

  const formatted = new Intl.NumberFormat('pt-BR').format(count)
  return `${formatted} visualizacoes`
}

/**
 * Componente de resultado de busca individual
 * @param {Object} props
 * @param {Object} props.result - Dados do resultado
 * @param {Function} props.onPlay - Callback ao clicar em reproduzir
 * @param {Function} props.onDownload - Callback ao clicar em baixar
 * @param {boolean} props.isPlaying - Se este video esta tocando
 */
function SearchResult({ result, onPlay, onDownload, isPlaying }) {
  const {
    id,
    title,
    thumbnail,
    channel,
    channelUrl,
    duration,
    viewCount,
    uploadDate,
    url
  } = result

  const handlePlay = () => {
    if (onPlay) {
      onPlay(result)
    }
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload(result)
    }
  }

  return (
    <div className={`search-result-card ${isPlaying ? 'playing' : ''}`}>
      <div className="result-thumbnail-container">
        <img
          src={thumbnail || '/placeholder-thumbnail.jpg'}
          alt={title}
          className="result-thumbnail"
          loading="lazy"
        />
        <span className="result-duration">{formatDuration(duration)}</span>
        <button
          className="thumbnail-play-btn"
          onClick={handlePlay}
          title="Reproduzir"
          aria-label="Reproduzir"
        >
          <span className="play-icon"></span>
        </button>
      </div>

      <div className="result-info">
        <h3 className="result-title" title={title}>
          {title}
        </h3>

        <div className="result-meta">
          <span className="result-channel" title={channel}>
            {channel}
          </span>
          <span className="result-separator">-</span>
          <span className="result-views">
            {formatViewCount(viewCount)}
          </span>
        </div>

        <div className="result-actions">
          <button
            className="result-btn result-btn-play"
            onClick={handlePlay}
            title="Reproduzir (streaming)"
          >
            <span className="btn-icon btn-icon-play"></span>
            <span>Reproduzir</span>
          </button>

          <button
            className="result-btn result-btn-download"
            onClick={handleDownload}
            title="Adicionar a fila de downloads"
          >
            <span className="btn-icon btn-icon-download"></span>
            <span>Baixar</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default SearchResult
