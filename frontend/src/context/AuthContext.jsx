import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const TOKEN_KEY = 'music-downloader-token'
const USER_KEY = 'music-downloader-user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState(true)

  // On mount, verify token is still valid via /me
  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    const API_BASE = import.meta.env.PROD
      ? 'https://api.downytube.papelaria.vip/api'
      : '/api'

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user)
          setToken(data.token)
          localStorage.setItem(TOKEN_KEY, data.token)
          localStorage.setItem(USER_KEY, JSON.stringify(data.user))
        } else {
          // Token invalid, clear
          logout()
        }
      })
      .catch(() => {
        // Network error - keep cached data, don't logout
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback((newToken, newUser) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!token) return

    const API_BASE = import.meta.env.PROD
      ? 'https://api.downytube.papelaria.vip/api'
      : '/api'

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setUser(data.user)
        setToken(data.token)
        localStorage.setItem(TOKEN_KEY, data.token)
        localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      }
    } catch {
      // ignore
    }
  }, [token])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
