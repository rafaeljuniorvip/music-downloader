import { useState, useEffect, useCallback } from 'react'
import { api } from '../../services/api'
import StatCard from './StatCard'
import './StatsPage.css'

// Utility functions for formatting
function formatBytes(bytes) {
  if (bytes === 0 || bytes === undefined || bytes === null) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)).toLocaleString('pt-BR') + ' ' + sizes[i]
}

function formatNumber(num) {
  if (num === undefined || num === null) return '0'
  return num.toLocaleString('pt-BR')
}

function formatSpeed(bytesPerSecond) {
  if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s'
  return formatBytes(bytesPerSecond) + '/s'
}

function formatPercentage(value) {
  if (value === undefined || value === null) return '0%'
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}

function StatsPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.getStatistics()
      if (response.success && response.data) {
        setStats(response.data)
        setLastUpdated(new Date())
        setError(null)
      }
    } catch (err) {
      console.error('Error fetching statistics:', err)
      setError('Erro ao carregar estatisticas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)

    return () => clearInterval(interval)
  }, [fetchStats])

  // Calculate metrics from the nested API response
  const total = stats?.total || {}
  const totalDownloads = total.totalDownloads || 0
  const completedDownloads = total.completed || 0
  const failedDownloads = total.failed || 0
  const totalStorage = total.storageUsed || 0
  const successRate = stats?.successRate?.successRate || 0
  const avgSpeed = total.averageSpeed || 0

  // Map topSources to expected format
  const topSources = (stats?.topSources || []).map(source => ({
    name: source.channel,
    count: source.downloadCount
  }))

  if (loading) {
    return (
      <div className="stats-page">
        <div className="stats-loading">
          <div className="loading-spinner"></div>
          <span>Carregando estatisticas...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="stats-page">
        <div className="stats-error">
          <span className="stats-error-icon"></span>
          <span>{error}</span>
          <button className="btn btn-primary" onClick={fetchStats}>
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="stats-page">
      {/* Summary Cards */}
      <section className="stats-section">
        <div className="section-header">
          <span className="section-icon section-icon-chart"></span>
          <h3 className="section-title">Resumo</h3>
          {lastUpdated && (
            <span className="stats-last-updated">
              Atualizado: {lastUpdated.toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>
        <div className="stats-cards-grid">
          <StatCard
            title="Downloads Concluidos"
            value={formatNumber(completedDownloads)}
            icon="download"
            subtitle={`${formatNumber(totalDownloads)} total`}
          />
          <StatCard
            title="Armazenamento Usado"
            value={formatBytes(totalStorage)}
            icon="storage"
          />
          <StatCard
            title="Taxa de Sucesso"
            value={formatPercentage(successRate)}
            icon="success"
            subtitle={`${formatNumber(failedDownloads)} falhas`}
          />
          <StatCard
            title="Velocidade Media"
            value={formatSpeed(avgSpeed)}
            icon="speed"
          />
        </div>
      </section>

      {/* Recent Activity Chart Placeholder */}
      <section className="stats-section">
        <div className="section-header">
          <span className="section-icon section-icon-activity"></span>
          <h3 className="section-title">Atividade Recente</h3>
        </div>
        <div className="section-content">
          <div className="chart-placeholder">
            <span className="chart-placeholder-icon"></span>
            <span className="chart-placeholder-text">
              Grafico de atividade sera exibido aqui
            </span>
          </div>
        </div>
      </section>

      {/* Top Sources */}
      <section className="stats-section">
        <div className="section-header">
          <span className="section-icon section-icon-sources"></span>
          <h3 className="section-title">Principais Fontes</h3>
        </div>
        <div className="section-content">
          {topSources.length > 0 ? (
            <div className="sources-list">
              {topSources.map((source, index) => (
                <div key={index} className="source-item">
                  <span className="source-rank">{index + 1}</span>
                  <div className="source-info">
                    <span className="source-name">{source.name || source.channel || 'Desconhecido'}</span>
                    <span className="source-count">{formatNumber(source.count)} downloads</span>
                  </div>
                  <div className="source-bar-wrapper">
                    <div
                      className="source-bar"
                      style={{
                        width: `${topSources[0]?.count ? (source.count / topSources[0].count) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-state-icon"></span>
              <span className="empty-state-text">Nenhuma fonte registrada ainda</span>
            </div>
          )}
        </div>
      </section>

      {/* Additional Stats */}
      {stats?.additionalStats && (
        <section className="stats-section">
          <div className="section-header">
            <span className="section-icon section-icon-info"></span>
            <h3 className="section-title">Informacoes Adicionais</h3>
          </div>
          <div className="section-content">
            <div className="additional-stats-grid">
              {stats.additionalStats.totalDuration && (
                <div className="additional-stat">
                  <span className="additional-stat-label">Duracao Total</span>
                  <span className="additional-stat-value">{stats.additionalStats.totalDuration}</span>
                </div>
              )}
              {stats.additionalStats.mostDownloadedFormat && (
                <div className="additional-stat">
                  <span className="additional-stat-label">Formato Mais Baixado</span>
                  <span className="additional-stat-value">{stats.additionalStats.mostDownloadedFormat}</span>
                </div>
              )}
              {stats.additionalStats.peakHour !== undefined && (
                <div className="additional-stat">
                  <span className="additional-stat-label">Horario de Pico</span>
                  <span className="additional-stat-value">{stats.additionalStats.peakHour}:00</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default StatsPage
