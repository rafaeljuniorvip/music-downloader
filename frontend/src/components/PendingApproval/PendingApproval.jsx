import { useAuth } from '../../context/AuthContext'
import './PendingApproval.css'

export default function PendingApproval() {
  const { user, logout, refreshUser } = useAuth()

  return (
    <div className="pending-page">
      <div className="pending-card">
        <div className="pending-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h2>Aguardando Aprovacao</h2>
        <p>Sua conta <strong>{user?.email}</strong> esta aguardando aprovacao de um administrador.</p>
        <p className="pending-hint">Voce sera notificado quando sua conta for aprovada.</p>
        <div className="pending-actions">
          <button className="btn-refresh" onClick={refreshUser}>
            Verificar status
          </button>
          <button className="btn-logout" onClick={logout}>
            Sair
          </button>
        </div>
      </div>
    </div>
  )
}
