import { useTheme } from '../../hooks/useTheme'
import './Layout.css'

function Layout({ children, activeTab, onTabChange }) {
  const { theme, toggleTheme, isDark } = useTheme()

  const menuItems = [
    { id: 'search', label: 'Buscar', icon: 'search' },
    { id: 'queue', label: 'Fila de Downloads', icon: 'download' },
    { id: 'history', label: 'Historico', icon: 'history' },
    { id: 'stats', label: 'Estatisticas', icon: 'chart' },
    { id: 'settings', label: 'Configuracoes', icon: 'settings' }
  ]

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">Music Downloader</h1>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <span className={`nav-icon nav-icon-${item.icon}`}></span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          >
            <span className={`theme-icon ${isDark ? 'theme-icon-sun' : 'theme-icon-moon'}`}></span>
            <span className="theme-label">{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
          <p className="version">v1.0.0</p>
        </div>
      </aside>
      <main className="main-content">
        <header className="content-header">
          <h2 className="page-title">
            {activeTab === 'search' && 'Buscar'}
            {activeTab === 'queue' && 'Fila de Downloads'}
            {activeTab === 'history' && 'Historico'}
            {activeTab === 'stats' && 'Estatisticas'}
            {activeTab === 'settings' && 'Configuracoes'}
          </h2>
        </header>
        <div className="content-body">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout
