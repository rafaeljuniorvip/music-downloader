import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import './ApiKeysPage.css'

export default function ApiKeysPage() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState(null)
  const { addToast } = useToast()

  const fetchKeys = async () => {
    try {
      const data = await api.getApiKeys()
      if (data.success) setKeys(data.keys)
    } catch (err) {
      addToast('Erro ao carregar API keys', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchKeys() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newKeyName.trim()) return
    try {
      const data = await api.createApiKey(newKeyName.trim())
      if (data.success) {
        setCreatedKey(data.key)
        setNewKeyName('')
        addToast('API key criada', 'success')
        fetchKeys()
      }
    } catch (err) {
      addToast('Erro ao criar API key', 'error')
    }
  }

  const handleRevoke = async (id, name) => {
    if (!confirm(`Revogar API key "${name}"?`)) return
    try {
      await api.revokeApiKey(id)
      addToast('API key revogada', 'success')
      fetchKeys()
    } catch (err) {
      addToast('Erro ao revogar API key', 'error')
    }
  }

  const handleCopyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey)
      addToast('Chave copiada para a area de transferencia', 'success')
    }
  }

  if (loading) {
    return <div className="apikeys-loading">Carregando API keys...</div>
  }

  return (
    <div className="apikeys-page">
      {/* Create new key */}
      <section className="apikeys-section">
        <h3 className="section-title">Criar Nova API Key</h3>
        <div className="create-form-container">
          <form className="create-form" onSubmit={handleCreate}>
            <input
              type="text"
              className="create-input"
              placeholder="Nome da key (ex: N8N Producao)"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
            />
            <button type="submit" className="btn-create" disabled={!newKeyName.trim()}>
              Criar Key
            </button>
          </form>

          {createdKey && (
            <div className="created-key-banner">
              <p className="created-key-warning">
                Copie esta chave agora. Ela nao sera exibida novamente.
              </p>
              <div className="created-key-value">
                <code>{createdKey}</code>
                <button className="btn-copy" onClick={handleCopyKey}>Copiar</button>
              </div>
              <button className="btn-dismiss" onClick={() => setCreatedKey(null)}>Fechar</button>
            </div>
          )}
        </div>
      </section>

      {/* Keys list */}
      <section className="apikeys-section">
        <h3 className="section-title">API Keys ({keys.length})</h3>
        <div className="apikeys-table-container">
          <table className="apikeys-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Prefixo</th>
                <th>Criada por</th>
                <th>Status</th>
                <th>Ultimo uso</th>
                <th>Criada em</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-row">Nenhuma API key criada</td>
                </tr>
              ) : (
                keys.map(k => (
                  <tr key={k.id} className={!k.active ? 'revoked-row' : ''}>
                    <td className="key-name">{k.name}</td>
                    <td><code className="key-prefix">{k.key_prefix}...</code></td>
                    <td>{k.user_name || k.user_email}</td>
                    <td>
                      <span className={`status-badge status-${k.active ? 'active' : 'revoked'}`}>
                        {k.active ? 'Ativa' : 'Revogada'}
                      </span>
                    </td>
                    <td>{k.last_used ? new Date(k.last_used).toLocaleDateString('pt-BR') : 'Nunca'}</td>
                    <td>{new Date(k.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>
                      {k.active && (
                        <button className="btn-revoke" onClick={() => handleRevoke(k.id, k.name)}>
                          Revogar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Usage instructions */}
      <section className="apikeys-section">
        <h3 className="section-title">Como usar</h3>
        <div className="usage-info">
          <p>Envie a API key no header <code>x-api-key</code> das suas requisicoes:</p>
          <pre className="usage-code">{`curl -H "x-api-key: dk_sua_chave_aqui" \\
  https://api.downytube.papelaria.vip/api/v1/search?q=musica

curl -X POST -H "x-api-key: dk_sua_chave_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://youtube.com/watch?v=..."}' \\
  https://api.downytube.papelaria.vip/api/v1/download`}</pre>
        </div>
      </section>
    </div>
  )
}
