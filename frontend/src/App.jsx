import { useState, useEffect, useCallback, useRef } from 'react'
import Layout from './components/Layout/Layout'
import SearchPage from './components/SearchPage/SearchPage'
import DownloadForm from './components/DownloadForm/DownloadForm'
import QueueList from './components/QueueList/QueueList'
import HistoryList from './components/HistoryList/HistoryList'
import SettingsPage from './components/SettingsPage/SettingsPage'
import StatsPage from './components/StatsPage/StatsPage'
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp/KeyboardShortcutsHelp'
import MiniPlayer from './components/MiniPlayer/MiniPlayer'
import { api } from './services/api'
import { useToast } from './context/ToastContext'
import { PlayerProvider } from './context/PlayerContext'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import './App.css'

// URL base da API (mesmo do api.js)
const API_BASE = import.meta.env.PROD
  ? 'https://api.downytube.papelaria.vip/api'
  : '/api'

// Mapeamento de rotas para tabs
const ROUTE_TO_TAB = {
  '/': 'queue',
  '/queue': 'queue',
  '/search': 'search',
  '/history': 'history',
  '/stats': 'stats',
  '/settings': 'settings'
}

const TAB_TO_ROUTE = {
  queue: '/queue',
  search: '/search',
  history: '/history',
  stats: '/stats',
  settings: '/settings'
}

// Obtem tab inicial baseado na URL
function getInitialTab() {
  const path = window.location.pathname
  return ROUTE_TO_TAB[path] || 'queue'
}

function App() {
  const [activeTab, setActiveTab] = useState(getInitialTab)
  const [queue, setQueue] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const eventSourceRef = useRef(null)
  const downloadFormRef = useRef(null)
  const searchPageRef = useRef(null)
  const { addToast } = useToast()

  // Funcao para mudar de tab e atualizar URL
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab)
    const route = TAB_TO_ROUTE[tab] || '/queue'
    window.history.pushState({ tab }, '', route)
  }, [])

  // Escuta eventos de navegacao do browser (back/forward)
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab)
      } else {
        const tab = getInitialTab()
        setActiveTab(tab)
      }
    }

    window.addEventListener('popstate', handlePopState)

    // Define o estado inicial do history
    const currentTab = getInitialTab()
    const route = TAB_TO_ROUTE[currentTab] || '/queue'
    window.history.replaceState({ tab: currentTab }, '', route)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Keyboard shortcuts handlers
  const handleFocusInput = useCallback(() => {
    if (activeTab !== 'queue') {
      handleTabChange('queue')
    }
    // Pequeno delay para garantir que o componente esteja montado
    setTimeout(() => {
      if (downloadFormRef.current) {
        downloadFormRef.current.focusInput()
      }
    }, 50)
  }, [activeTab, handleTabChange])

  const handleShowShortcutsHelp = useCallback(() => {
    setShowShortcutsHelp(prev => !prev)
  }, [])

  const handleCloseShortcutsHelp = useCallback(() => {
    setShowShortcutsHelp(false)
  }, [])

  // Handler para focar no campo de busca
  const handleFocusSearch = useCallback(() => {
    if (activeTab !== 'search') {
      handleTabChange('search')
    }
    // Pequeno delay para garantir que o componente esteja montado
    setTimeout(() => {
      if (searchPageRef.current) {
        searchPageRef.current.focusInput()
      }
    }, 50)
  }, [activeTab, handleTabChange])

  // Registrar atalhos de teclado
  useKeyboardShortcuts({
    onFocusInput: handleFocusInput,
    onFocusSearch: handleFocusSearch,
    onGoToSearch: () => handleTabChange('search'),
    onGoToQueue: () => handleTabChange('queue'),
    onGoToHistory: () => handleTabChange('history'),
    onGoToStats: () => handleTabChange('stats'),
    onGoToSettings: () => handleTabChange('settings'),
    onEscape: handleCloseShortcutsHelp,
    onShowHelp: handleShowShortcutsHelp
  })

  const fetchQueue = async () => {
    try {
      const response = await api.getQueue()
      if (response.success && response.data) {
        setQueue(response.data.items || [])
      }
    } catch (error) {
      console.error('Error fetching queue:', error)
    }
  }

  const fetchHistory = async () => {
    try {
      const response = await api.getHistory()
      if (response.success && response.data) {
        setHistory(response.data.items || [])
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    }
  }

  // Setup SSE connection
  useEffect(() => {
    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      const eventSource = new EventSource(`${API_BASE}/download/progress`)
      eventSourceRef.current = eventSource

      eventSource.addEventListener('init', (e) => {
        const data = JSON.parse(e.data)
        setQueue(data || [])
      })

      eventSource.addEventListener('progress', (e) => {
        const data = JSON.parse(e.data)
        setQueue(prev => prev.map(item =>
          item.id === data.id ? { ...item, ...data } : item
        ))
      })

      eventSource.addEventListener('statusChange', (e) => {
        const data = JSON.parse(e.data)
        setQueue(prev => prev.map(item =>
          item.id === data.id ? { ...item, ...data } : item
        ))
      })

      eventSource.addEventListener('complete', (e) => {
        const data = JSON.parse(e.data)
        setQueue(prev => prev.map(item =>
          item.id === data.id ? { ...item, ...data } : item
        ))
        fetchHistory()
        addToast(`Download concluido: ${data.title || 'Arquivo'}`, 'success')
      })

      eventSource.addEventListener('error', (e) => {
        if (e.data) {
          const data = JSON.parse(e.data)
          setQueue(prev => prev.map(item =>
            item.id === data.id ? { ...item, ...data } : item
          ))
          addToast(`Erro no download: ${data.error || 'Falha desconhecida'}`, 'error')
        }
      })

      eventSource.addEventListener('added', (e) => {
        const data = JSON.parse(e.data)
        setQueue(prev => [...prev, ...(Array.isArray(data) ? data : [data])])
        const items = Array.isArray(data) ? data : [data]
        if (items.length === 1) {
          addToast(`Download adicionado: ${items[0].title || 'Novo item'}`, 'info')
        } else {
          addToast(`${items.length} downloads adicionados`, 'info')
        }
      })

      eventSource.addEventListener('removed', (e) => {
        const data = JSON.parse(e.data)
        setQueue(prev => prev.filter(item => item.id !== data.id))
      })

      eventSource.onerror = () => {
        console.log('SSE connection error, reconnecting...')
        eventSource.close()
        setTimeout(connectSSE, 3000)
      }
    }

    connectSSE()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchQueue(), fetchHistory()])
      setLoading(false)
    }
    loadData()
  }, [])

  const handleAddDownload = async (url, type) => {
    try {
      const response = await api.addDownload(url, type)
      if (!response.success) {
        throw new Error(response.error)
      }
      return response
    } catch (error) {
      console.error('Error adding download:', error)
      addToast(`Erro ao adicionar download: ${error.message || 'Falha desconhecida'}`, 'error')
      throw error
    }
  }

  const handlePauseResume = async (id, currentStatus) => {
    try {
      if (currentStatus === 'paused') {
        await api.resumeDownload(id)
      } else {
        await api.pauseDownload(id)
      }
    } catch (error) {
      console.error('Error pause/resume:', error)
    }
  }

  const handleCancel = async (id) => {
    try {
      await api.cancelDownload(id)
    } catch (error) {
      console.error('Error canceling:', error)
    }
  }

  const handleRetry = async (id) => {
    try {
      await api.retryDownload(id)
    } catch (error) {
      console.error('Error retrying:', error)
    }
  }

  const handleRedownload = async (url) => {
    try {
      await api.addDownload(url)
      handleTabChange('queue')
    } catch (error) {
      console.error('Error re-downloading:', error)
    }
  }

  const handleClearHistory = async () => {
    try {
      await api.clearHistory()
      fetchHistory()
    } catch (error) {
      console.error('Error clearing history:', error)
    }
  }

  const handleClearCompleted = async () => {
    try {
      await api.clearCompleted()
      setQueue(prev => prev.filter(item =>
        !['completed', 'error', 'cancelled'].includes(item.status)
      ))
    } catch (error) {
      console.error('Error clearing completed:', error)
    }
  }

  const handlePauseAll = async () => {
    try {
      await api.pauseAll()
      setQueue(prev => prev.map(item =>
        item.status === 'downloading' || item.status === 'waiting'
          ? { ...item, status: 'paused' }
          : item
      ))
      addToast('Todos os downloads foram pausados', 'info')
    } catch (error) {
      console.error('Error pausing all:', error)
      addToast('Erro ao pausar downloads', 'error')
    }
  }

  const handleResumeAll = async () => {
    try {
      await api.resumeAll()
      setQueue(prev => prev.map(item =>
        item.status === 'paused'
          ? { ...item, status: 'waiting' }
          : item
      ))
      addToast('Todos os downloads foram retomados', 'info')
    } catch (error) {
      console.error('Error resuming all:', error)
      addToast('Erro ao retomar downloads', 'error')
    }
  }

  return (
    <PlayerProvider>
      <Layout activeTab={activeTab} onTabChange={handleTabChange}>
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando...</p>
          </div>
        ) : (
          <>
            {activeTab === 'search' && (
              <SearchPage ref={searchPageRef} />
            )}
            {activeTab === 'queue' && (
              <div className="queue-page">
                <DownloadForm ref={downloadFormRef} onSubmit={handleAddDownload} />
                <QueueList
                  items={queue}
                  onPauseResume={handlePauseResume}
                  onCancel={handleCancel}
                  onRetry={handleRetry}
                  onClearCompleted={handleClearCompleted}
                  onPauseAll={handlePauseAll}
                  onResumeAll={handleResumeAll}
                />
              </div>
            )}
            {activeTab === 'history' && (
              <HistoryList
                items={history}
                onRedownload={handleRedownload}
                onClearHistory={handleClearHistory}
              />
            )}
            {activeTab === 'stats' && (
              <StatsPage />
            )}
            {activeTab === 'settings' && (
              <SettingsPage />
            )}
          </>
        )}
      </Layout>
      <MiniPlayer />
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={handleCloseShortcutsHelp}
      />
    </PlayerProvider>
  )
}

export default App
