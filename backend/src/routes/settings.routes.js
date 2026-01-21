import { Router } from 'express';
import settingsService from '../services/settings.service.js';

const router = Router();

/**
 * GET /api/settings
 * Get all settings with defaults and valid options
 */
router.get('/', async (req, res) => {
  try {
    const settings = await settingsService.getAll();
    const defaults = settingsService.getDefaults();
    const validOptions = settingsService.getValidOptions();

    res.json({
      success: true,
      data: {
        settings,
        defaults,
        validOptions
      }
    });
  } catch (error) {
    console.error('Erro ao buscar configuracoes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar configuracoes',
      details: error.message
    });
  }
});

/**
 * PUT /api/settings
 * Update settings
 */
router.put('/', async (req, res) => {
  try {
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhuma configuracao fornecida para atualizar'
      });
    }

    const settings = await settingsService.update(updates);

    res.json({
      success: true,
      message: 'Configuracoes atualizadas com sucesso',
      data: settings
    });
  } catch (error) {
    console.error('Erro ao atualizar configuracoes:', error);

    // Check if it's a validation error
    if (error.message.includes('deve ser')) {
      return res.status(400).json({
        success: false,
        error: 'Erro de validacao',
        details: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar configuracoes',
      details: error.message
    });
  }
});

/**
 * POST /api/settings/reset
 * Reset all settings to defaults
 */
router.post('/reset', async (req, res) => {
  try {
    const settings = await settingsService.resetToDefaults();

    res.json({
      success: true,
      message: 'Configuracoes restauradas para os valores padrao',
      data: settings
    });
  } catch (error) {
    console.error('Erro ao restaurar configuracoes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao restaurar configuracoes',
      details: error.message
    });
  }
});

/**
 * GET /api/settings/:key
 * Get a single setting by key
 */
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const defaults = settingsService.getDefaults();

    if (!(key in defaults)) {
      return res.status(404).json({
        success: false,
        error: `Configuracao '${key}' nao encontrada`
      });
    }

    const value = await settingsService.get(key);

    res.json({
      success: true,
      data: {
        key,
        value,
        default: defaults[key]
      }
    });
  } catch (error) {
    console.error('Erro ao buscar configuracao:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar configuracao',
      details: error.message
    });
  }
});

/**
 * PUT /api/settings/:key
 * Update a single setting
 */
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const defaults = settingsService.getDefaults();

    if (!(key in defaults)) {
      return res.status(404).json({
        success: false,
        error: `Configuracao '${key}' nao encontrada`
      });
    }

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Valor nao fornecido'
      });
    }

    const newValue = await settingsService.set(key, value);

    res.json({
      success: true,
      message: `Configuracao '${key}' atualizada com sucesso`,
      data: {
        key,
        value: newValue
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar configuracao:', error);

    // Check if it's a validation error
    if (error.message.includes('deve ser')) {
      return res.status(400).json({
        success: false,
        error: 'Erro de validacao',
        details: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar configuracao',
      details: error.message
    });
  }
});

export default router;
