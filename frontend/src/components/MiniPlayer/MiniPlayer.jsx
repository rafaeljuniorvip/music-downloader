import { useRef, useEffect, useCallback } from 'react'
import { usePlayer } from '../../context/PlayerContext'
import './MiniPlayer.css'

function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00'

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    duration,
    currentTime,
    volume,
    isMuted,
    error,
    togglePlayPause,
    stopTrack,
    seekTo,
    setVolume,
    toggleMute
  } = usePlayer()

  const progressBarRef = useRef(null)
  const volumeBarRef = useRef(null)
  const isDraggingProgress = useRef(false)
  const isDraggingVolume = useRef(false)

  // Handle progress bar click/drag
  const handleProgressClick = useCallback((e) => {
    if (!progressBarRef.current || duration === 0) return

    const rect = progressBarRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    seekTo(percentage * duration)
  }, [duration, seekTo])

  const handleProgressMouseDown = useCallback((e) => {
    isDraggingProgress.current = true
    handleProgressClick(e)
  }, [handleProgressClick])

  const handleProgressMouseMove = useCallback((e) => {
    if (isDraggingProgress.current) {
      handleProgressClick(e)
    }
  }, [handleProgressClick])

  const handleProgressMouseUp = useCallback(() => {
    isDraggingProgress.current = false
  }, [])

  // Handle volume bar click/drag
  const handleVolumeClick = useCallback((e) => {
    if (!volumeBarRef.current) return

    const rect = volumeBarRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    setVolume(percentage)
  }, [setVolume])

  const handleVolumeMouseDown = useCallback((e) => {
    isDraggingVolume.current = true
    handleVolumeClick(e)
  }, [handleVolumeClick])

  const handleVolumeMouseMove = useCallback((e) => {
    if (isDraggingVolume.current) {
      handleVolumeClick(e)
    }
  }, [handleVolumeClick])

  const handleVolumeMouseUp = useCallback(() => {
    isDraggingVolume.current = false
  }, [])

  // Global mouse events for dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      handleProgressMouseMove(e)
      handleVolumeMouseMove(e)
    }

    const handleGlobalMouseUp = () => {
      handleProgressMouseUp()
      handleVolumeMouseUp()
    }

    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [handleProgressMouseMove, handleVolumeMouseMove, handleProgressMouseUp, handleVolumeMouseUp])

  // Keyboard shortcuts when player is focused
  const handleKeyDown = useCallback((e) => {
    if (e.code === 'Space') {
      e.preventDefault()
      togglePlayPause()
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault()
      seekTo(Math.max(0, currentTime - 5))
    } else if (e.code === 'ArrowRight') {
      e.preventDefault()
      seekTo(Math.min(duration, currentTime + 5))
    } else if (e.code === 'KeyM') {
      e.preventDefault()
      toggleMute()
    }
  }, [togglePlayPause, seekTo, currentTime, duration, toggleMute])

  // Don't render if no track
  if (!currentTrack) {
    return null
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0
  const volumePercentage = isMuted ? 0 : volume * 100

  return (
    <div
      className="mini-player"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Reprodutor de audio"
    >
      {/* Track Info */}
      <div className="player-track-info">
        <div className="player-thumbnail">
          {currentTrack.thumbnail ? (
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          ) : (
            <div className="player-thumbnail-placeholder">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
          )}
          {isLoading && (
            <div className="player-thumbnail-loading">
              <div className="loading-spinner-small"></div>
            </div>
          )}
        </div>
        <div className="player-track-details">
          <span className="player-track-title" title={currentTrack.title}>
            {currentTrack.title}
          </span>
          <span className="player-track-channel" title={currentTrack.channel}>
            {currentTrack.channel || 'Artista desconhecido'}
          </span>
        </div>
      </div>

      {/* Player Controls */}
      <div className="player-controls">
        <div className="player-buttons">
          <button
            className={`player-btn player-btn-main ${isLoading ? 'loading' : ''}`}
            onClick={togglePlayPause}
            disabled={isLoading}
            title={isPlaying ? 'Pausar (Espaco)' : 'Reproduzir (Espaco)'}
            aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            {isLoading ? (
              <div className="loading-spinner-btn"></div>
            ) : isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="player-progress-container">
          <span className="player-time">{formatTime(currentTime)}</span>
          <div
            className="player-progress-bar"
            ref={progressBarRef}
            onMouseDown={handleProgressMouseDown}
            role="slider"
            aria-label="Progresso do audio"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
          >
            <div
              className="player-progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
            <div
              className="player-progress-handle"
              style={{ left: `${progressPercentage}%` }}
            />
          </div>
          <span className="player-time">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume & Actions */}
      <div className="player-actions">
        {/* Volume Control */}
        <div className="player-volume">
          <button
            className="player-btn player-btn-sm"
            onClick={toggleMute}
            title={isMuted ? 'Ativar som (M)' : 'Silenciar (M)'}
            aria-label={isMuted ? 'Ativar som' : 'Silenciar'}
          >
            {isMuted || volume === 0 ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              </svg>
            ) : volume < 0.5 ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            )}
          </button>
          <div
            className="player-volume-bar"
            ref={volumeBarRef}
            onMouseDown={handleVolumeMouseDown}
            role="slider"
            aria-label="Volume"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={volumePercentage}
          >
            <div
              className="player-volume-fill"
              style={{ width: `${volumePercentage}%` }}
            />
            <div
              className="player-volume-handle"
              style={{ left: `${volumePercentage}%` }}
            />
          </div>
        </div>

        {/* Close Button */}
        <button
          className="player-btn player-btn-close"
          onClick={stopTrack}
          title="Fechar reprodutor"
          aria-label="Fechar reprodutor"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="player-error">
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export default MiniPlayer
