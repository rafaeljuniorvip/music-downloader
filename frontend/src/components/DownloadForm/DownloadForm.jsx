import { useState, forwardRef, useImperativeHandle, useRef } from 'react'
import './DownloadForm.css'

const DownloadForm = forwardRef(function DownloadForm({ onSubmit }, ref) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const isPlaylist = url.includes('playlist') || url.includes('list=')

  // Expor metodo para focar no input
  useImperativeHandle(ref, () => ({
    focusInput: () => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
    }
  }))

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!url.trim()) {
      setError('Por favor, insira uma URL')
      return
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      setError('URL invalida. Use uma URL do YouTube')
      return
    }

    setLoading(true)
    setError('')

    try {
      await onSubmit(url.trim())
      setUrl('')
    } catch (err) {
      setError(err.message || 'Erro ao adicionar download')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="download-form-card">
      <h3 className="form-title">Adicionar Download</h3>
      <form className="download-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            ref={inputRef}
            type="text"
            className={`url-input ${error ? 'input-error' : ''}`}
            placeholder="Cole a URL do YouTube aqui..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setError('')
            }}
            disabled={loading}
          />
          {isPlaylist && url && (
            <span className="playlist-badge">Playlist detectada</span>
          )}
        </div>
        {error && <p className="error-message">{error}</p>}
        <button
          type="submit"
          className="submit-btn"
          disabled={loading || !url.trim()}
        >
          {loading ? (
            <>
              <span className="btn-spinner"></span>
              Adicionando...
            </>
          ) : (
            <>
              <span className="btn-icon">+</span>
              Adicionar a Fila
            </>
          )}
        </button>
      </form>
      <p className="form-hint">
        Suporta videos individuais e playlists do YouTube
      </p>
    </div>
  )
})

export default DownloadForm
