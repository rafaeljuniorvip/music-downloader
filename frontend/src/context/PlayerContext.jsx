import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const PlayerContext = createContext(null)

const API_BASE = '/api'

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [error, setError] = useState(null)

  const audioRef = useRef(null)

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = 'metadata'

      // Audio event listeners
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current.duration)
        setIsLoading(false)
      })

      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current.currentTime)
      })

      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false)
        setCurrentTime(0)
      })

      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio error:', e)
        setError('Erro ao carregar audio')
        setIsLoading(false)
        setIsPlaying(false)
      })

      audioRef.current.addEventListener('waiting', () => {
        setIsLoading(true)
      })

      audioRef.current.addEventListener('canplay', () => {
        setIsLoading(false)
      })

      audioRef.current.addEventListener('playing', () => {
        setIsLoading(false)
        setIsPlaying(true)
      })

      audioRef.current.addEventListener('pause', () => {
        setIsPlaying(false)
      })
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  const playTrack = useCallback(async (track) => {
    if (!track || !track.videoId) {
      console.error('Invalid track data')
      return
    }

    setIsLoading(true)
    setError(null)
    setCurrentTime(0)
    setDuration(0)

    // Set the track immediately for UI feedback
    setCurrentTrack({
      videoId: track.videoId,
      title: track.title || 'Carregando...',
      thumbnail: track.thumbnail || '',
      channel: track.channel || ''
    })

    try {
      // Build stream URL - the backend serves audio directly
      const streamUrl = `${API_BASE}/stream/${track.videoId}`

      if (audioRef.current) {
        audioRef.current.src = streamUrl
        audioRef.current.load()

        // Try to play
        await audioRef.current.play()
        setIsPlaying(true)
      }
    } catch (err) {
      console.error('Error playing track:', err)
      setError('Erro ao reproduzir audio')
      setIsLoading(false)
      setIsPlaying(false)
    }
  }, [])

  const pauseTrack = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  const resumeTrack = useCallback(async () => {
    if (audioRef.current && audioRef.current.paused && currentTrack) {
      try {
        await audioRef.current.play()
        setIsPlaying(true)
      } catch (err) {
        console.error('Error resuming track:', err)
        setError('Erro ao retomar audio')
      }
    }
  }, [currentTrack])

  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      pauseTrack()
    } else {
      await resumeTrack()
    }
  }, [isPlaying, pauseTrack, resumeTrack])

  const stopTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current.currentTime = 0
    }
    setCurrentTrack(null)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setError(null)
  }, [])

  const seekTo = useCallback((time) => {
    if (audioRef.current && !isNaN(time) && isFinite(time)) {
      audioRef.current.currentTime = Math.max(0, Math.min(time, duration))
      setCurrentTime(audioRef.current.currentTime)
    }
  }, [duration])

  const setAudioVolume = useCallback((newVolume) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    setVolume(clampedVolume)
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : clampedVolume
    }
  }, [isMuted])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev)
  }, [])

  const value = {
    // State
    currentTrack,
    isPlaying,
    isLoading,
    duration,
    currentTime,
    volume,
    isMuted,
    error,

    // Actions
    playTrack,
    pauseTrack,
    resumeTrack,
    togglePlayPause,
    stopTrack,
    seekTo,
    setVolume: setAudioVolume,
    toggleMute
  }

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return context
}

export default PlayerContext
