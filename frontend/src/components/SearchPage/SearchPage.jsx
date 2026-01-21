import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import SearchResult from './SearchResult'
import { api } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import './SearchPage.css'

/**
 * Sugestoes de busca para estado vazio
 */
const SEARCH_SUGGESTIONS = [
  'Musicas romanticas anos 80',
  'Top hits 2024',
  'Musica para estudar',
  'Rock classico internacional',
  'MPB classicos',
  'Lo-fi beats',
  'Sertanejo universitario',
  'Jazz instrumental'
]

/**
 * Pagina de busca do YouTube
 * Permite buscar videos e adiciona-los para download ou streaming
 */
const SearchPage = forwardRef(function SearchPage({ onAddToQueue, onPlayStream }, ref) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [playingId, setPlayingId] = useState(null)

  const searchInputRef = useRef(null)
  const { addToast } = useToast()

  const RESULTS_PER_PAGE = 12

  // Expor metodo para focar no input de busca
  useImperativeHandle(ref, () => ({
    focusInput: () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus()
        searchInputRef.current.select()
      }
    }
  }))

  /**
   * Realiza a busca no YouTube
   */
  const handleSearch = useCallback(async (resetResults = true) => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return
    }

    if (resetResults) {
      setLoading(true)
      setResults([])
      setCurrentPage(1)
      setError(null)
    } else {
      setLoadingMore(true)
    }

    try {
      const page = resetResults ? 1 : currentPage + 1
      const response = await api.searchYouTube(trimmedQuery, RESULTS_PER_PAGE, page)

      if (response.success) {
        const newResults = response.data?.results || []

        if (resetResults) {
          setResults(newResults)
        } else {
          setResults(prev => [...prev, ...newResults])
        }

        setHasMore(newResults.length >= RESULTS_PER_PAGE)
        setCurrentPage(page)
        setHasSearched(true)
      } else {
        throw new Error(response.error || 'Erro ao buscar')
      }
    } catch (err) {
      console.error('Search error:', err)
      setError(err.message || 'Erro ao realizar busca. Tente novamente.')
      addToast('Erro ao buscar no YouTube', 'error')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [query, currentPage, addToast])

  /**
   * Handler para tecla Enter no input
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch(true)
    }
  }

  /**
   * Buscar por sugestao
   */
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion)
    // Usar timeout para garantir que o state foi atualizado
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }, 0)
  }

  // Efeito para buscar quando query muda via sugestao
  useEffect(() => {
    if (query && !hasSearched && SEARCH_SUGGESTIONS.includes(query)) {
      handleSearch(true)
    }
  }, [query])

  /**
   * Carregar mais resultados
   */
  const handleLoadMore = () => {
    handleSearch(false)
  }

  /**
   * Reproduzir video em streaming
   */
  const handlePlay = async (result) => {
    try {
      setPlayingId(result.id)
      const streamUrl = api.getStreamUrl(result.id)

      if (onPlayStream) {
        onPlayStream({
          id: result.id,
          title: result.title,
          channel: result.channel,
          thumbnail: result.thumbnail,
          streamUrl,
          url: result.url
        })
      }

      addToast(`Reproduzindo: ${result.title}`, 'info')
    } catch (err) {
      console.error('Play error:', err)
      addToast('Erro ao reproduzir video', 'error')
      setPlayingId(null)
    }
  }

  /**
   * Adicionar video a fila de downloads
   */
  const handleDownload = async (result) => {
    try {
      const url = result.url || `https://www.youtube.com/watch?v=${result.id}`
      const response = await api.addDownload(url, 'audio')

      if (response.success) {
        addToast(`Adicionado a fila: ${result.title}`, 'success')

        if (onAddToQueue) {
          onAddToQueue(result)
        }
      } else {
        throw new Error(response.error)
      }
    } catch (err) {
      console.error('Download error:', err)
      addToast(`Erro ao adicionar download: ${err.message}`, 'error')
    }
  }

  /**
   * Limpar busca
   */
  const handleClear = () => {
    setQuery('')
    setResults([])
    setHasSearched(false)
    setError(null)
    setCurrentPage(1)
    setHasMore(false)
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }

  return (
    <div className="search-page">
      {/* Barra de busca */}
      <div className="search-header">
        <div className="search-input-container">
          <span className="search-input-icon"></span>
          <input
            ref={searchInputRef}
            type="text"
            className="search-main-input"
            placeholder="Buscar musicas no YouTube..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Campo de busca"
          />
          {query && (
            <button
              className="search-clear-btn"
              onClick={handleClear}
              title="Limpar busca"
              aria-label="Limpar busca"
            >
              <span className="clear-icon"></span>
            </button>
          )}
          <button
            className="search-submit-btn"
            onClick={() => handleSearch(true)}
            disabled={!query.trim() || loading}
            title="Buscar"
          >
            {loading ? (
              <span className="search-loading-spinner"></span>
            ) : (
              <span>Buscar</span>
            )}
          </button>
        </div>
      </div>

      {/* Conteudo principal */}
      <div className="search-content">
        {/* Estado de carregamento */}
        {loading && (
          <div className="search-loading">
            <div className="loading-spinner"></div>
            <p>Buscando...</p>
          </div>
        )}

        {/* Estado de erro */}
        {error && !loading && (
          <div className="search-error">
            <span className="error-icon"></span>
            <p>{error}</p>
            <button className="retry-btn" onClick={() => handleSearch(true)}>
              Tentar novamente
            </button>
          </div>
        )}

        {/* Estado vazio (antes da primeira busca) */}
        {!loading && !error && !hasSearched && (
          <div className="search-empty">
            <div className="empty-icon-large"></div>
            <h3>Buscar musicas no YouTube</h3>
            <p>Digite o nome da musica, artista ou playlist que deseja encontrar</p>

            <div className="search-suggestions">
              <span className="suggestions-label">Sugestoes:</span>
              <div className="suggestions-list">
                {SEARCH_SUGGESTIONS.map((suggestion, index) => (
                  <button
                    key={index}
                    className="suggestion-tag"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Nenhum resultado encontrado */}
        {!loading && !error && hasSearched && results.length === 0 && (
          <div className="search-no-results">
            <span className="no-results-icon"></span>
            <h3>Nenhum resultado encontrado</h3>
            <p>Tente usar outras palavras-chave ou verifique a ortografia</p>
          </div>
        )}

        {/* Grid de resultados */}
        {!loading && results.length > 0 && (
          <>
            <div className="search-results-header">
              <span className="results-count">
                {results.length} resultado{results.length !== 1 ? 's' : ''} para "{query}"
              </span>
            </div>

            <div className="search-results-grid">
              {results.map((result) => (
                <SearchResult
                  key={result.id}
                  result={result}
                  onPlay={handlePlay}
                  onDownload={handleDownload}
                  isPlaying={playingId === result.id}
                />
              ))}
            </div>

            {/* Botao de carregar mais */}
            {hasMore && (
              <div className="load-more-container">
                <button
                  className="load-more-btn"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <span className="btn-loading-spinner"></span>
                      <span>Carregando...</span>
                    </>
                  ) : (
                    <span>Carregar mais resultados</span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
})

export default SearchPage
