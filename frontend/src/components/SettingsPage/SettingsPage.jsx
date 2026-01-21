import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { api } from '../../services/api'
import './SettingsPage.css'

function SettingsPage() {
  const [settings, setSettings] = useState({
    audioQuality: '0',
    audioFormat: 'mp3',
    maxConcurrent: 3,
    autoRetry: true,
    maxRetries: 3,
    embedThumbnail: true
  })
  const [defaults, setDefaults] = useState({})
  const [validOptions, setValidOptions] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalSettings, setOriginalSettings] = useState({})
  const { addToast } = useToast()

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings)
    setHasChanges(changed)
  }, [settings, originalSettings])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await api.getSettings()
      if (response.success && response.data) {
        setSettings(response.data.settings)
        setOriginalSettings(response.data.settings)
        setDefaults(response.data.defaults || {})
        setValidOptions(response.data.validOptions || {})
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      addToast('Erro ao carregar configuracoes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await api.updateSettings(settings)
      if (response.success) {
        setOriginalSettings(settings)
        addToast('Configuracoes salvas com sucesso', 'success')
      } else {
        throw new Error(response.error || 'Erro ao salvar')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      addToast(`Erro ao salvar configuracoes: ${error.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    try {
      setSaving(true)
      const response = await api.resetSettings()
      if (response.success && response.data) {
        setSettings(response.data.settings)
        setOriginalSettings(response.data.settings)
        addToast('Configuracoes restauradas para o padrao', 'success')
      } else {
        throw new Error(response.error || 'Erro ao restaurar')
      }
    } catch (error) {
      console.error('Error resetting settings:', error)
      addToast(`Erro ao restaurar configuracoes: ${error.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const qualityLabels = {
    '0': 'Melhor qualidade',
    '128': '128 kbps',
    '192': '192 kbps',
    '320': '320 kbps'
  }

  const formatLabels = {
    'mp3': 'MP3',
    'm4a': 'M4A',
    'wav': 'WAV',
    'opus': 'Opus'
  }

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="loading-spinner"></div>
        <p>Carregando configuracoes...</p>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <div className="settings-section">
        <div className="section-header">
          <span className="section-icon section-icon-audio"></span>
          <h3 className="section-title">Configuracoes de Audio</h3>
        </div>
        <div className="section-content">
          <div className="form-group">
            <label className="form-label" htmlFor="audioQuality">
              Qualidade do Audio
            </label>
            <select
              id="audioQuality"
              className="form-select"
              value={settings.audioQuality}
              onChange={(e) => handleChange('audioQuality', e.target.value)}
              disabled={saving}
            >
              {(validOptions.audioQuality || ['0', '128', '192', '320']).map(opt => (
                <option key={opt} value={opt}>
                  {qualityLabels[opt] || opt}
                </option>
              ))}
            </select>
            <span className="form-hint">
              Define a qualidade de saida do audio
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="audioFormat">
              Formato do Audio
            </label>
            <select
              id="audioFormat"
              className="form-select"
              value={settings.audioFormat}
              onChange={(e) => handleChange('audioFormat', e.target.value)}
              disabled={saving}
            >
              {(validOptions.audioFormat || ['mp3', 'm4a', 'wav', 'opus']).map(opt => (
                <option key={opt} value={opt}>
                  {formatLabels[opt] || opt.toUpperCase()}
                </option>
              ))}
            </select>
            <span className="form-hint">
              Formato de saida para os arquivos de audio
            </span>
          </div>

          <div className="form-group">
            <div className="toggle-row">
              <div className="toggle-info">
                <label className="form-label" htmlFor="embedThumbnail">
                  Incorporar Thumbnail
                </label>
                <span className="form-hint">
                  Incorpora a capa do video no arquivo de audio
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  id="embedThumbnail"
                  checked={settings.embedThumbnail}
                  onChange={(e) => handleChange('embedThumbnail', e.target.checked)}
                  disabled={saving}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-header">
          <span className="section-icon section-icon-download"></span>
          <h3 className="section-title">Configuracoes de Download</h3>
        </div>
        <div className="section-content">
          <div className="form-group">
            <label className="form-label" htmlFor="maxConcurrent">
              Downloads Simultaneos
            </label>
            <input
              type="number"
              id="maxConcurrent"
              className="form-input form-input-number"
              value={settings.maxConcurrent}
              onChange={(e) => handleChange('maxConcurrent', parseInt(e.target.value) || 1)}
              min={1}
              max={5}
              disabled={saving}
            />
            <span className="form-hint">
              Numero maximo de downloads simultaneos (1-5)
            </span>
          </div>

          <div className="form-group">
            <div className="toggle-row">
              <div className="toggle-info">
                <label className="form-label" htmlFor="autoRetry">
                  Tentar Novamente Automaticamente
                </label>
                <span className="form-hint">
                  Tenta novamente automaticamente em caso de falha
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  id="autoRetry"
                  checked={settings.autoRetry}
                  onChange={(e) => handleChange('autoRetry', e.target.checked)}
                  disabled={saving}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="maxRetries">
              Maximo de Tentativas
            </label>
            <input
              type="number"
              id="maxRetries"
              className="form-input form-input-number"
              value={settings.maxRetries}
              onChange={(e) => handleChange('maxRetries', parseInt(e.target.value) || 1)}
              min={1}
              max={5}
              disabled={saving || !settings.autoRetry}
            />
            <span className="form-hint">
              Numero maximo de tentativas em caso de falha (1-5)
            </span>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleReset}
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="btn-spinner"></span>
              Restaurando...
            </>
          ) : (
            'Restaurar Padrao'
          )}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <>
              <span className="btn-spinner"></span>
              Salvando...
            </>
          ) : (
            'Salvar Configuracoes'
          )}
        </button>
      </div>
    </div>
  )
}

export default SettingsPage
