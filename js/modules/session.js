/**
 * Session Management
 * Handles review session lifecycle, progress tracking, and state persistence
 */

import { getDueCards } from '../data/indexeddb.js';
import { saveSession as saveSessionToDB } from '../data/indexeddb.js';
import { calculateNextReview } from './srs.js';

/**
 * @typedef {Object} SessionState
 * @property {Card[]} queue - Cards in current review session
 * @property {number} currentIndex - Current card position in queue
 * @property {number} reviewed - Number of cards reviewed this session
 * @property {number} correct - Number of successful reviews (Good/Easy)
 * @property {number} againCount - Consecutive "Again" ratings (for glitch trigger)
 * @property {number} startTime - Session start timestamp
 */

let sessionState = {
  queue: [],
  currentIndex: 0,
  reviewed: 0,
  correct: 0,
  againCount: 0,
  startTime: null
};

/**
 * Start a new review session
 * @param {number} [limit] - Maximum cards to include (default from settings)
 * @param {string} [deckType] - Type of deck: 'daily', 'core', 'golden'
 * @returns {Promise<SessionState>}
 */
export const startSession = async (limit = 50, deckType = 'daily') => {
  logEvent('INFO', 'session-start', { limit, deckType });
  
  let cards = await getDueCards(999); // Get all due cards first

  if (deckType === 'golden') {
    cards = cards.filter(c => c.goldenSet === true);
  } else if (deckType === 'core') {
    cards = cards.filter(c => c.category === 'core');
  }
  
  // Apply limit
  cards = cards.slice(0, limit);

  sessionState = {
    queue: cards,
    currentIndex: 0,
    reviewed: 0,
    correct: 0,
    againCount: 0,
    startTime: Date.now()
  };
  
  logEvent('INFO', 'session-queued', {
    cardCount: sessionState.queue.length,
    deckType
  });
  
  updateProgressDisplay();
  announce('Session started with ' + sessionState.queue.length + ' cards to review.');
  
  return sessionState;
};

/**
 * Get the current card from the queue
 * @returns {Card|null}
 */
export const getCurrentCard = () => {
  if (sessionState.currentIndex >= sessionState.queue.length) {
    return null;
  }
  return sessionState.queue[sessionState.currentIndex];
};

/**
 * Rate the current card and move to next
 * @param {number} rating - 0=Again, 1=Hard, 2=Good, 3=Easy
 * @returns {Promise<{card: Card, glitchTriggered: boolean}>}
 */
export const rateCurrentCard = async (rating) => {
  const currentCard = getCurrentCard();
  if (!currentCard) {
    throw new Error('No current card to rate');
  }
  
  logEvent('INFO', 'card-rate', {
    cardId: currentCard.id,
    rating
  });
  
  const updatedCard = calculateNextReview(currentCard, rating);
  
  try {
    await saveSessionReview(currentCard, rating, updatedCard);
    sessionState.queue[sessionState.currentIndex] = updatedCard;
    
    if (rating > 0) {
      sessionState.reviewed++;
    }
    
    if (rating >= 2) {
      sessionState.correct++;
      sessionState.againCount = 0;
    } else if (rating === 0) {
      sessionState.againCount++;
    }
    
    if (rating > 0) {
      sessionState.currentIndex++;
    }
    updateProgressDisplay();
    
    const glitchTriggered = rating === 0;
    
    if (sessionState.currentIndex >= sessionState.queue.length) {
      await endSession();
    }
    
    return {
      card: updatedCard,
      glitchTriggered
    };
  } catch (error) {
    logEvent('ERROR', 'card-rate-fail', {
      cardId: currentCard.id,
      error: error.message
    });
    throw error;
  }
};

/**
 * End the current review session
 * @returns {Promise<void>}
 */
export const endSession = async () => {
  const duration = Date.now() - sessionState.startTime;
  
  const sessionRecord = {
    id: generateId(),
    date: Date.now(),
    cardsReviewed: sessionState.reviewed,
    correctCount: sessionState.correct,
    avgInterval: calculateAverageInterval(),
    duration
  };
  
  await saveSessionToDB(sessionRecord);
  
  logEvent('INFO', 'session-end', sessionRecord);
  announce('Session complete! ' + sessionState.reviewed + ' cards reviewed.');
  
  sessionState = {
    queue: [],
    currentIndex: 0,
    reviewed: 0,
    correct: 0,
    againCount: 0,
    startTime: null
  };
  
  updateProgressDisplay();
};

/**
 * Check if session has more cards
 * @returns {boolean}
 */
export const hasMoreCards = () => {
  return sessionState.currentIndex < sessionState.queue.length;
};

/**
 * Get session progress for display
 * @returns {object}
 */
export const getSessionProgress = () => {
  return {
    reviewed: sessionState.reviewed,
    total: sessionState.queue.length,
    correct: sessionState.correct,
    duration: sessionState.startTime ? Date.now() - sessionState.startTime : 0
  };
};

const saveSessionReview = async (card, rating, updatedCard) => {
  const { saveCard } = await import('../data/indexeddb.js');
  await saveCard(updatedCard);
};

const calculateAverageInterval = () => {
  if (sessionState.queue.length === 0) return 0;
  const intervals = sessionState.queue
    .slice(0, sessionState.currentIndex)
    .map(card => card.interval || 0);
  const sum = intervals.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / intervals.length) || 0;
};

const updateProgressDisplay = () => {
  const progressEl = document.getElementById('session-progress');
  if (progressEl) {
    const { reviewed, total } = getSessionProgress();
    progressEl.textContent = `${reviewed} / ${total}`;
  }
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

const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
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
