/**
 * Import pre-loaded content and initialize database
 */

import { saveCard, getDueCards, getCard } from '../data/indexeddb.js';
import { saveSettings, prefersReducedMotion } from '../data/localstorage.js';

const CONTENT_FILES = [
  { path: '/js/assets/golden-sentences.json', collectionKey: 'goldenSentences', track: 'structure' },
  { path: '/js/assets/core-words.json', collectionKey: 'coreWords', track: 'structure' },
  { path: '/js/assets/pronunciation-golden.json', collectionKey: 'goldenPronunciation', track: 'phonetics', deck: 'golden' },
  { path: '/js/assets/pronunciation-core.json', collectionKey: 'corePhoneticChunks', track: 'phonetics', deck: 'core' }
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

const normalizeStructureCard = (card) => {
  if (card.track) return card;
  return {
    ...card,
    track: 'structure'
  };
};

const normalizePronunciationCard = (rawCard, deck) => {
  const now = Date.now();
  const isGolden = deck === 'golden';
  return {
    id: rawCard.id,
    front: rawCard.es,
    back: rawCard.en,
    analysisEs: rawCard.notaEs,
    analysisEn: rawCard.notaEn || '',
    cardType: 'phonetics',
    category: 'phonetics',
    track: 'phonetics',
    goldenSet: isGolden,
    phoneticsDeck: deck,
    cluster: rawCard.cluster,
    esMirror: rawCard.esMirror,
    enMirror: rawCard.enMirror,
    createdAt: now,
    interval: 1,
    ease: 2.5,
    dueDate: now,
    reviews: 0
  };
};

const normalizeCard = (card, source) => {
  const track = source.track;
  if (track === 'phonetics') {
    return normalizePronunciationCard(card, source.deck);
  }
  return normalizeStructureCard(card);
};

/**
 * Load and import all content files
 * @returns {Promise<{golden: number, core: number, phoneticsGolden: number, phoneticsCore: number}>}
 */
export const importContent = async () => {
  const stats = { golden: 0, core: 0, phoneticsGolden: 0, phoneticsCore: 0 };

  for (const source of CONTENT_FILES) {
    try {
      const response = await fetch(source.path);
      const data = await response.json();
      const cards = data[source.collectionKey] || [];

      for (const rawCard of cards) {
        const card = normalizeCard(rawCard, source);
        try {
          const existing = await getCard(card.id);
          if (existing) {
            continue;
          }
          await saveCard(card);
          if (card.track === 'phonetics') {
            if (card.phoneticsDeck === 'golden') stats.phoneticsGolden++;
            else stats.phoneticsCore++;
          } else if (card.category === 'golden' || card.goldenSet === true) {
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
        source: source.path,
        count: cards.length,
        track: source.track
      });
    } catch (error) {
      logEvent('ERROR', 'file-load-fail', {
        filePath: source.path,
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
        phoneticsGolden: stats.phoneticsGolden,
        phoneticsCore: stats.phoneticsCore,
        reducedMotion
      });

      announce(
        'App initialized with '
        + stats.golden
        + ' structure golden, '
        + stats.core
        + ' structure core, '
        + stats.phoneticsGolden
        + ' phonetics golden, and '
        + stats.phoneticsCore
        + ' phonetics core cards.'
      );
    } else {
      await importContent();
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
