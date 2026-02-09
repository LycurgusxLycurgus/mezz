/**
 * SM-2 Spaced Repetition Algorithm
 * SuperMemo-2 implementation for Mezzofanti
 */

/**
 * @typedef {Object} Card
 * @property {string} id
 * @property {string} front - Spanish phrase
 * @property {string} back - English translation
 * @property {string} [ipa] - IPA pronunciation
 * @property {string} [context] - Context sentence
 * @property {string} [contextIpa] - IPA for context sentence
 * @property {string} [analysisEn] - Blueprint note (English)
 * @property {string} [analysisEs] - Blueprint note (Spanish)
 * @property {string} [cardType] - 'word' | 'chunk' | 'cloze'
 * @property {string} [chunkFocus] - Highlighted chunk
 * @property {string} [clozeText] - Cloze prompt
 * @property {string} [clozeAnswer] - Cloze answer
 * @property {string} [audioUrl] - Path to audio file
 * @property {number} interval - Days until next review
 * @property {number} ease - SM-2 ease factor (1.3-2.5)
 * @property {number} dueDate - Timestamp
 * @property {number} reviews - Total review count
 */

/**
 * Calculate next review state for a card based on user rating
 * @param {Card} card - Current card state
 * @param {number} rating - 0=Again, 1=Hard, 2=Good, 3=Easy
 * @returns {Card} - Updated card with new interval and ease
 */
export const calculateNextReview = (card, rating) => {
  const oldEase = card.ease || 2.5;
  let newEase = oldEase;
  let newInterval;
  
  // Ease factor adjustment (SM-2 algorithm)
  if (rating === 0) {
    newEase = oldEase - 0.2;
  } else if (rating === 3) {
    newEase = oldEase + 0.15;
  }
  
  // Clamp ease factor between 1.3 and 2.5
  newEase = Math.max(1.3, Math.min(2.5, newEase));
  
  // Interval calculation based on review count
  if (card.reviews === 0 || card.reviews === undefined) {
    newInterval = 1;
  } else if (card.reviews === 1) {
    newInterval = 6;
  } else {
    const prevInterval = card.interval || 1;
    newInterval = Math.round(prevInterval * newEase);
  }
  
  // For "Again" rating, reset interval to 1 day
  if (rating === 0) {
    newInterval = 1;
  }
  
  const newDueDate = Date.now() + (newInterval * 24 * 60 * 60 * 1000);
  
  logEvent('INFO', 'srs-calculate', {
    cardId: card.id,
    rating,
    oldEase,
    newEase,
    oldInterval: card.interval,
    newInterval,
    newReviews: card.reviews + 1
  });
  
  return {
    ...card,
    ease: newEase,
    interval: newInterval,
    dueDate: newDueDate,
    reviews: card.reviews + 1
  };
};

/**
 * Get rating value from button press or keyboard
 * @param {number} rating - 0=Again, 1=Hard, 2=Good, 3=Easy
 * @returns {string} - Human-readable label
 */
export const getRatingLabel = (rating) => {
  const labels = ['Again', 'Hard', 'Good', 'Easy'];
  return labels[rating] || 'Good';
};

/**
 * Check if card is due for review
 * @param {Card} card
 * @returns {boolean}
 */
export const isCardDue = (card) => {
  if (!card.dueDate) return true;
  return card.dueDate <= Date.now();
};

/**
 * Get cards overdue by more than 30 days
 * Resets their interval to 1 day and ease to 2.5
 * @param {Card[]} cards
 * @returns {Card[]} - Updated cards
 */
export const resetOverdueCards = (cards) => {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  return cards.map(card => {
    if (card.dueDate && now - card.dueDate > thirtyDaysMs) {
      logEvent('WARN', 'card-overdue-reset', {
        cardId: card.id,
        daysOverdue: Math.floor((now - card.dueDate) / (24 * 60 * 60 * 1000))
      });
      
      return {
        ...card,
        interval: 1,
        ease: 2.5,
        dueDate: now
      };
    }
    return card;
  });
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
