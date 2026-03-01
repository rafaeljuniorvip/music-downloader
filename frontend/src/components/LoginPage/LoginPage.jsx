import { useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import './LoginPage.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

const API_BASE = import.meta.env.PROD
  ? 'https://api.downytube.papelaria.vip/api'
  : '/api'

export default function LoginPage() {
  const { login } = useAuth()
  const googleBtnRef = useRef(null)

  useEffect(() => {
    if (!window.google || !GOOGLE_CLIENT_ID) return

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
    })

    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      width: 300,
    })
  }, [])

  async function handleGoogleResponse(response) {
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      })
      const data = await res.json()
      if (data.success) {
        login(data.token, data.user)
      } else {
        alert(data.error || 'Erro ao fazer login')
      }
    } catch (err) {
      console.error('Login error:', err)
      alert('Erro ao conectar com o servidor')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <h1>Music Downloader</h1>
          <p>Faca login para acessar o sistema</p>
        </div>
        <div className="login-body">
          <div ref={googleBtnRef} className="google-btn-container"></div>
          {!GOOGLE_CLIENT_ID && (
            <p className="login-error">GOOGLE_CLIENT_ID nao configurado</p>
          )}
        </div>
      </div>
    </div>
  )
}
