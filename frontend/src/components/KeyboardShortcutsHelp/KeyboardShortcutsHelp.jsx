import { useEffect, useRef } from 'react'
import './KeyboardShortcutsHelp.css'

function KeyboardShortcutsHelp({ isOpen, onClose }) {
  const modalRef = useRef(null)
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const modifierKey = isMac ? 'Cmd' : 'Ctrl'

  const shortcuts = [
    {
      category: 'Navegacao',
      items: [
        { keys: [modifierKey, '0'], description: 'Ir para Buscar' },
        { keys: [modifierKey, '1'], description: 'Ir para Fila de Downloads' },
        { keys: [modifierKey, '2'], description: 'Ir para Historico' },
        { keys: [modifierKey, '3'], description: 'Ir para Estatisticas' },
        { keys: [modifierKey, '4'], description: 'Ir para Configuracoes' }
      ]
    },
    {
      category: 'Acoes',
      items: [
        { keys: [modifierKey, 'K'], description: 'Buscar no YouTube' },
        { keys: [modifierKey, 'N'], description: 'Focar no campo de URL' },
        { keys: ['Esc'], description: 'Fechar modal / Limpar foco' }
      ]
    },
    {
      category: 'Ajuda',
      items: [
        { keys: [modifierKey, '/'], description: 'Mostrar/ocultar atalhos' }
      ]
    }
  ]

  // Fechar ao clicar fora do modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Fechar com Escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="shortcuts-overlay">
      <div className="shortcuts-modal" ref={modalRef}>
        <div className="shortcuts-header">
          <h3 className="shortcuts-title">Atalhos de Teclado</h3>
          <button className="shortcuts-close" onClick={onClose} aria-label="Fechar">
            <span className="close-icon"></span>
          </button>
        </div>
        <div className="shortcuts-content">
          {shortcuts.map((section) => (
            <div key={section.category} className="shortcuts-section">
              <h4 className="shortcuts-category">{section.category}</h4>
              <ul className="shortcuts-list">
                {section.items.map((shortcut, index) => (
                  <li key={index} className="shortcut-item">
                    <span className="shortcut-description">{shortcut.description}</span>
                    <span className="shortcut-keys">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex}>
                          <kbd className="kbd">{key}</kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="key-separator">+</span>
                          )}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="shortcuts-footer">
          <p className="shortcuts-hint">
            Pressione <kbd className="kbd kbd-small">Esc</kbd> para fechar
          </p>
        </div>
      </div>
    </div>
  )
}

export default KeyboardShortcutsHelp
