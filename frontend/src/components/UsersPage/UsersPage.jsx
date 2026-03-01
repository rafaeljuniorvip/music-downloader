import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import './UsersPage.css'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers()
      if (data.success) setUsers(data.users)
    } catch (err) {
      addToast('Erro ao carregar usuarios', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleApprove = async (id) => {
    try {
      await api.approveUser(id)
      addToast('Usuario aprovado', 'success')
      fetchUsers()
    } catch (err) {
      addToast('Erro ao aprovar usuario', 'error')
    }
  }

  const handleDelete = async (id, email) => {
    if (!confirm(`Remover usuario ${email}?`)) return
    try {
      await api.deleteUser(id)
      addToast('Usuario removido', 'success')
      fetchUsers()
    } catch (err) {
      addToast('Erro ao remover usuario', 'error')
    }
  }

  const handleRoleChange = async (id, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    try {
      await api.updateUserRole(id, newRole)
      addToast(`Role alterado para ${newRole}`, 'success')
      fetchUsers()
    } catch (err) {
      addToast('Erro ao alterar role', 'error')
    }
  }

  if (loading) {
    return <div className="users-loading">Carregando usuarios...</div>
  }

  const pendingUsers = users.filter(u => !u.approved)
  const approvedUsers = users.filter(u => u.approved)

  return (
    <div className="users-page">
      {pendingUsers.length > 0 && (
        <section className="users-section">
          <h3 className="section-title">Aguardando Aprovacao ({pendingUsers.length})</h3>
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Solicitado em</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        {u.picture && <img src={u.picture} alt="" className="user-cell-avatar" referrerPolicy="no-referrer" />}
                        <span>{u.name || '-'}</span>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-approve" onClick={() => handleApprove(u.id)}>Aprovar</button>
                        <button className="btn-reject" onClick={() => handleDelete(u.id, u.email)}>Rejeitar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="users-section">
        <h3 className="section-title">Usuarios Aprovados ({approvedUsers.length})</h3>
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Role</th>
                <th>Ultimo login</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {approvedUsers.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      {u.picture && <img src={u.picture} alt="" className="user-cell-avatar" referrerPolicy="no-referrer" />}
                      <span>{u.name || '-'}</span>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-badge role-${u.role}`}>{u.role}</span>
                  </td>
                  <td>{u.last_login ? new Date(u.last_login).toLocaleDateString('pt-BR') : 'Nunca'}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-role" onClick={() => handleRoleChange(u.id, u.role)}>
                        {u.role === 'admin' ? 'Tornar User' : 'Tornar Admin'}
                      </button>
                      <button className="btn-reject" onClick={() => handleDelete(u.id, u.email)}>Remover</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
