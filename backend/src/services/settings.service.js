import db from '../config/database.js';

// Default settings configuration
const DEFAULT_SETTINGS = {
  audioQuality: '0',        // '0' (best), '128', '192', '320'
  audioFormat: 'mp3',       // 'mp3', 'm4a', 'wav', 'opus'
  maxConcurrent: 2,         // 1-5
  downloadDir: null,        // Will be set to default path if null
  autoRetry: true,          // boolean
  maxRetries: 3,            // 1-5
  embedThumbnail: true      // boolean
};

// Valid values for validation
const VALID_AUDIO_QUALITIES = ['0', '128', '192', '320'];
const VALID_AUDIO_FORMATS = ['mp3', 'm4a', 'wav', 'opus'];

class SettingsService {
  constructor() {
    this.cachedSettings = null;
  }

  /**
   * Validates settings values
   */
  validateSettings(settings) {
    const errors = [];

    if (settings.audioQuality !== undefined) {
      if (!VALID_AUDIO_QUALITIES.includes(settings.audioQuality)) {
        errors.push(`audioQuality deve ser um dos valores: ${VALID_AUDIO_QUALITIES.join(', ')}`);
      }
    }

    if (settings.audioFormat !== undefined) {
      if (!VALID_AUDIO_FORMATS.includes(settings.audioFormat)) {
        errors.push(`audioFormat deve ser um dos valores: ${VALID_AUDIO_FORMATS.join(', ')}`);
      }
    }

    if (settings.maxConcurrent !== undefined) {
      const value = parseInt(settings.maxConcurrent);
      if (isNaN(value) || value < 1 || value > 5) {
        errors.push('maxConcurrent deve ser um numero entre 1 e 5');
      }
    }

    if (settings.maxRetries !== undefined) {
      const value = parseInt(settings.maxRetries);
      if (isNaN(value) || value < 1 || value > 5) {
        errors.push('maxRetries deve ser um numero entre 1 e 5');
      }
    }

    if (settings.autoRetry !== undefined) {
      if (typeof settings.autoRetry !== 'boolean') {
        errors.push('autoRetry deve ser um valor booleano');
      }
    }

    if (settings.embedThumbnail !== undefined) {
      if (typeof settings.embedThumbnail !== 'boolean') {
        errors.push('embedThumbnail deve ser um valor booleano');
      }
    }

    return errors;
  }

  /**
   * Initialize settings with defaults if not exists
   */
  async initializeDefaults() {
    const existing = await this.getAll();
    if (Object.keys(existing).length === 0) {
      await this.resetToDefaults();
    }
  }

  /**
   * Get all settings
   */
  async getAll() {
    const result = await db.query('SELECT key, value, type FROM settings');

    const settings = {};
    for (const row of result.rows) {
      settings[row.key] = this.parseValue(row.value, row.type);
    }

    // Merge with defaults for any missing settings
    const merged = { ...DEFAULT_SETTINGS, ...settings };
    this.cachedSettings = merged;

    return merged;
  }

  /**
   * Get a single setting by key
   */
  async get(key) {
    const result = await db.query(
      'SELECT value, type FROM settings WHERE key = $1',
      [key]
    );

    if (result.rows.length === 0) {
      return DEFAULT_SETTINGS[key] ?? null;
    }

    return this.parseValue(result.rows[0].value, result.rows[0].type);
  }

  /**
   * Update multiple settings
   */
  async update(settings) {
    // Validate settings
    const errors = this.validateSettings(settings);
    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }

    const client = await db.connect();

    try {
      await client.query('BEGIN');

      for (const [key, value] of Object.entries(settings)) {
        // Only update known settings
        if (key in DEFAULT_SETTINGS) {
          const type = this.getValueType(value);
          const stringValue = this.stringifyValue(value);

          await client.query(
            `INSERT INTO settings (key, value, type, updated_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             ON CONFLICT (key) DO UPDATE
             SET value = $2, type = $3, updated_at = CURRENT_TIMESTAMP`,
            [key, stringValue, type]
          );
        }
      }

      await client.query('COMMIT');

      // Clear cache
      this.cachedSettings = null;

      return await this.getAll();
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Set a single setting
   */
  async set(key, value) {
    // Validate single setting
    const errors = this.validateSettings({ [key]: value });
    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }

    if (!(key in DEFAULT_SETTINGS)) {
      throw new Error(`Configuracao desconhecida: ${key}`);
    }

    const type = this.getValueType(value);
    const stringValue = this.stringifyValue(value);

    await db.query(
      `INSERT INTO settings (key, value, type, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE
       SET value = $2, type = $3, updated_at = CURRENT_TIMESTAMP`,
      [key, stringValue, type]
    );

    // Clear cache
    this.cachedSettings = null;

    return await this.get(key);
  }

  /**
   * Reset all settings to defaults
   */
  async resetToDefaults() {
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // Clear existing settings
      await client.query('DELETE FROM settings');

      // Insert defaults
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        const type = this.getValueType(value);
        const stringValue = this.stringifyValue(value);

        await client.query(
          `INSERT INTO settings (key, value, type, updated_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
          [key, stringValue, type]
        );
      }

      await client.query('COMMIT');

      // Clear cache
      this.cachedSettings = null;

      return { ...DEFAULT_SETTINGS };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get cached settings (for performance in hot paths)
   */
  async getCached() {
    if (!this.cachedSettings) {
      await this.getAll();
    }
    return this.cachedSettings;
  }

  /**
   * Get audio quality value for yt-dlp
   * Returns the bitrate or '0' for best quality
   */
  async getAudioQuality() {
    return await this.get('audioQuality');
  }

  /**
   * Get audio format for yt-dlp
   */
  async getAudioFormat() {
    return await this.get('audioFormat');
  }

  /**
   * Get max concurrent downloads
   */
  async getMaxConcurrent() {
    return await this.get('maxConcurrent');
  }

  /**
   * Get download directory
   */
  async getDownloadDir() {
    return await this.get('downloadDir');
  }

  /**
   * Get auto retry setting
   */
  async getAutoRetry() {
    return await this.get('autoRetry');
  }

  /**
   * Get max retries
   */
  async getMaxRetries() {
    return await this.get('maxRetries');
  }

  /**
   * Get embed thumbnail setting
   */
  async getEmbedThumbnail() {
    return await this.get('embedThumbnail');
  }

  /**
   * Helper: Parse stored value based on type
   */
  parseValue(value, type) {
    if (value === null || value === 'null') return null;

    switch (type) {
      case 'number':
        return parseInt(value, 10);
      case 'boolean':
        return value === 'true';
      case 'string':
      default:
        return value;
    }
  }

  /**
   * Helper: Get value type
   */
  getValueType(value) {
    if (value === null) return 'string';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    return 'string';
  }

  /**
   * Helper: Convert value to string for storage
   */
  stringifyValue(value) {
    if (value === null) return 'null';
    return String(value);
  }

  /**
   * Get default settings object
   */
  getDefaults() {
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Get valid options for settings
   */
  getValidOptions() {
    return {
      audioQuality: VALID_AUDIO_QUALITIES,
      audioFormat: VALID_AUDIO_FORMATS,
      maxConcurrent: { min: 1, max: 5 },
      maxRetries: { min: 1, max: 5 }
    };
  }
}

export default new SettingsService();
