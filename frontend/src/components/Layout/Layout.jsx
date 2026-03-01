import { useTheme } from '../../hooks/useTheme'
import './Layout.css'

function Layout({ children, activeTab, onTabChange, user, onLogout }) {
  const { theme, toggleTheme, isDark } = useTheme()

  const menuItems = [
    { id: 'search', label: 'Buscar', icon: 'search' },
    { id: 'queue', label: 'Fila de Downloads', icon: 'download' },
    { id: 'history', label: 'Historico', icon: 'history' },
    { id: 'stats', label: 'Estatisticas', icon: 'chart' },
    { id: 'settings', label: 'Configuracoes', icon: 'settings' }
  ]

  const adminItems = [
    { id: 'users', label: 'Usuarios', icon: 'users' },
    { id: 'api-keys', label: 'API Keys', icon: 'key' }
  ]

  const isAdmin = user?.role === 'admin'

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
          {isAdmin && (
            <>
              <div className="nav-separator">
                <span className="nav-separator-label">Admin</span>
              </div>
              {adminItems.map(item => (
                <button
                  key={item.id}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => onTabChange(item.id)}
                >
                  <span className={`nav-icon nav-icon-${item.icon}`}></span>
                  <span className="nav-label">{item.label}</span>
                </button>
              ))}
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          {user && (
            <div className="user-info">
              {user.picture ? (
                <img src={user.picture} alt="" className="user-avatar" referrerPolicy="no-referrer" />
              ) : (
                <div className="user-avatar-placeholder">
                  {(user.name || user.email || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="user-details">
                <span className="user-name">{user.name || user.email}</span>
                {user.role === 'admin' && <span className="user-badge">admin</span>}
              </div>
              <button className="btn-logout-sidebar" onClick={onLogout} title="Sair">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          )}
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
            {activeTab === 'users' && 'Usuarios'}
            {activeTab === 'api-keys' && 'API Keys'}
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
