/**
 * LocalStorage Adapter for Settings
 * Handles app configuration persistence
 */

const SETTINGS_KEY = 'settings';

/**
 * @typedef {Object} Settings
 * @property {number} dailyNewCards - Default: 10
 * @property {number} dailyReviewLimit - Default: 50
 * @property {boolean} audioEnabled - Default: true
 * @property {boolean} audioFirstMode - Default: false
 * @property {boolean} glitchEffectEnabled - Default: true
 * @property {boolean} reducedMotion - Default: false (detected)
 * @property {string} englishVariant - 'american' | 'british' - Default: 'american'
 * @property {boolean} onboardingCompleted - Default: false
 */

const DEFAULT_SETTINGS = {
  dailyNewCards: 10,
  dailyReviewLimit: 50,
  audioEnabled: true,
  audioFirstMode: false,
  glitchEffectEnabled: true,
  reducedMotion: false,
  englishVariant: 'american',
  onboardingCompleted: false
};


/**
 * Get settings from LocalStorage
 * @returns {Promise<Settings>}
 */
export const getSettings = async () => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    
    if (!stored) {
      logEvent('INFO', 'settings-default', { defaults: DEFAULT_SETTINGS });
      return { ...DEFAULT_SETTINGS };
    }
    
    const parsed = JSON.parse(stored);
    const settings = { ...DEFAULT_SETTINGS, ...parsed };
    
    logEvent('INFO', 'settings-loaded', { settings });
    return settings;
  } catch (error) {
    logEvent('ERROR', 'settings-load', { error: error.message });
    return { ...DEFAULT_SETTINGS };
  }
};

/**
 * Save settings to LocalStorage
 * @param {Partial<Settings>} settings
 * @returns {Promise<void>}
 */
export const saveSettings = async (settings) => {
  try {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    
    logEvent('INFO', 'settings-save', { updated });
    
    return;
  } catch (error) {
    const storageError = {
      code: 'STORAGE_ERROR',
      message: 'Failed to save settings',
      context: { error: error.message, settings },
      recoverable: true
    };
    logEvent('ERROR', 'settings-save', { error: storageError });
    throw storageError;
  }
};

/**
 * Check if reduced motion is preferred by system
 * @returns {boolean}
 */
export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Detect system color scheme preference
 * @returns {'dark' | 'light'}
 */
export const prefersDarkMode = () => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const logEvent = (level, context, data) => {
  const entry = {
    level,
    timestamp: Date.now(),
    correlationId: generateId(),
    context,
    data
  };
  console.log(JSON.stringify(entry));
};

const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
};
