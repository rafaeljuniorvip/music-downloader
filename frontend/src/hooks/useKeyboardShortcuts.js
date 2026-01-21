import { useEffect, useCallback } from 'react'

/**
 * Hook para gerenciar atalhos de teclado globais
 * @param {Object} handlers - Objeto com callbacks para cada acao
 * @param {Function} handlers.onFocusInput - Ctrl+N: Focar no campo de URL
 * @param {Function} handlers.onFocusSearch - Ctrl+K: Ir para busca e focar no campo
 * @param {Function} handlers.onGoToSearch - Ctrl+0: Ir para aba Buscar
 * @param {Function} handlers.onGoToQueue - Ctrl+1: Ir para aba Fila
 * @param {Function} handlers.onGoToHistory - Ctrl+2: Ir para aba Historico
 * @param {Function} handlers.onGoToStats - Ctrl+3: Ir para aba Estatisticas
 * @param {Function} handlers.onGoToSettings - Ctrl+4: Ir para aba Configuracoes
 * @param {Function} handlers.onEscape - Escape: Fechar modais/limpar busca
 * @param {Function} handlers.onShowHelp - Ctrl+?: Mostrar ajuda de atalhos
 */
export function useKeyboardShortcuts(handlers = {}) {
  const {
    onFocusInput,
    onFocusSearch,
    onGoToSearch,
    onGoToQueue,
    onGoToHistory,
    onGoToStats,
    onGoToSettings,
    onEscape,
    onShowHelp
  } = handlers

  const handleKeyDown = useCallback((event) => {
    // Ignorar quando estiver digitando em inputs, textareas ou contenteditable
    const target = event.target
    const tagName = target.tagName.toLowerCase()
    const isEditable = target.isContentEditable
    const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select'

    // Permitir Escape mesmo em inputs
    if (event.key === 'Escape') {
      if (onEscape) {
        onEscape()
      }
      // Se estiver em um input, desfoca ele
      if (isInput && document.activeElement) {
        document.activeElement.blur()
      }
      return
    }

    // Nao processar outros atalhos quando estiver em campos de texto
    if (isInput || isEditable) {
      return
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const modifier = isMac ? event.metaKey : event.ctrlKey

    // Ctrl+N ou Cmd+N: Focar no input de URL
    if (modifier && event.key.toLowerCase() === 'n') {
      event.preventDefault()
      if (onFocusInput) {
        onFocusInput()
      }
      return
    }

    // Ctrl+K ou Cmd+K: Ir para busca e focar no campo
    if (modifier && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      if (onFocusSearch) {
        onFocusSearch()
      }
      return
    }

    // Ctrl+0: Ir para Buscar
    if (modifier && event.key === '0') {
      event.preventDefault()
      if (onGoToSearch) {
        onGoToSearch()
      }
      return
    }

    // Ctrl+1: Ir para Fila
    if (modifier && event.key === '1') {
      event.preventDefault()
      if (onGoToQueue) {
        onGoToQueue()
      }
      return
    }

    // Ctrl+2: Ir para Historico
    if (modifier && event.key === '2') {
      event.preventDefault()
      if (onGoToHistory) {
        onGoToHistory()
      }
      return
    }

    // Ctrl+3: Ir para Estatisticas
    if (modifier && event.key === '3') {
      event.preventDefault()
      if (onGoToStats) {
        onGoToStats()
      }
      return
    }

    // Ctrl+4: Ir para Configuracoes
    if (modifier && event.key === '4') {
      event.preventDefault()
      if (onGoToSettings) {
        onGoToSettings()
      }
      return
    }

    // Ctrl+? ou Ctrl+/: Mostrar ajuda de atalhos
    if (modifier && (event.key === '?' || event.key === '/')) {
      event.preventDefault()
      if (onShowHelp) {
        onShowHelp()
      }
      return
    }
  }, [onFocusInput, onFocusSearch, onGoToSearch, onGoToQueue, onGoToHistory, onGoToStats, onGoToSettings, onEscape, onShowHelp])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}

export default useKeyboardShortcuts
