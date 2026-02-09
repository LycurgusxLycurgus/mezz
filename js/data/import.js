/**
 * Import pre-loaded content and initialize database
 */

import { initDB, saveCard, getDueCards } from '../data/indexeddb.js';
import { saveSettings, prefersReducedMotion } from '../data/localstorage.js';

const CONTENT_FILES = [
  '/js/assets/golden-sentences.json',
  '/js/assets/core-words.json'
];

/**
 * Check if database is empty and needs initialization
 * @returns {Promise<boolean>}
 */
export const needsInitialization = async () => {
  try {
    const dueCards = await getDueCards(999);
    const isEmpty = dueCards.length === 0;
    logEvent('INFO', 'init-check', { needsInit: isEmpty });
    return isEmpty;
  } catch (error) {
    logEvent('WARN', 'init-check-fail', { error: error.message });
    return true;
  }
};

/**
 * Load and import all content files
 * @returns {Promise<{golden: number, core: number}>}
 */
export const importContent = async () => {
  const stats = { golden: 0, core: 0 };
  
  for (const filePath of CONTENT_FILES) {
    try {
      const response = await fetch(filePath);
      const data = await response.json();
      
      const cards = data.goldenSentences || data.coreWords || [];
      
      for (const card of cards) {
        try {
          await saveCard(card);
          if (card.category === 'golden') {
            stats.golden++;
          } else {
            stats.core++;
          }
        } catch (error) {
          logEvent('WARN', 'card-import-fail', {
            cardId: card.id,
            error: error.message
          });
        }
      }
      
      logEvent('INFO', 'content-imported', {
        source: filePath,
        count: cards.length
      });
    } catch (error) {
      logEvent('ERROR', 'file-load-fail', {
        filePath,
        error: error.message
      });
    }
  }
  
  return stats;
};

/**
 * Initialize app with content and settings
 * @returns {Promise<void>}
 */
export const initializeApp = async () => {
  logEvent('INFO', 'app-init-start', { timestamp: Date.now() });
  
  try {
    const needsInit = await needsInitialization();
    
    if (needsInit) {
      logEvent('INFO', 'database-init-needed', { importing: true });
      const stats = await importContent();
      
      const reducedMotion = prefersReducedMotion();
      await saveSettings({ reducedMotion, onboardingCompleted: true });
      
      logEvent('INFO', 'app-init-complete', {
        goldenCards: stats.golden,
        coreCards: stats.core,
        reducedMotion
      });
      
      announce('App initialized with ' + stats.golden + ' golden sentences and ' + stats.core + ' core words.');
    } else {
      logEvent('INFO', 'app-init-skip', { reason: 'database-exists' });
      announce('App loaded. Ready to learn!');
    }
  } catch (error) {
    logEvent('ERROR', 'app-init-failed', { error: error.message });
    announce('App started with limited data. Please refresh if needed.');
  }
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

const announce = (message) => {
  const announcer = document.getElementById('sr-announcer');
  if (announcer) {
    announcer.textContent = message;
    setTimeout(() => {
      announcer.textContent = '';
    }, 3000);
  }
};
