/**
 * IndexedDB Storage Adapter
 * Handles card storage, session logging, and review tracking
 */

const DB_NAME = 'mezzofanti';
const DB_VERSION = 2;
const STORES = {
  CARDS: 'cards',
  SESSIONS: 'sessions',
  REVIEWS: 'reviews'
};

const FALLBACK_TIMEOUT_MS = 3000;
const fallbackStores = {
  cards: new Map(),
  sessions: new Map(),
  reviews: new Map()
};

let dbConnection = null;
let dbInitPromise = null;
let useFallback = false;
let fallbackNotified = false;

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
 * @property {string} category - 'golden' | 'core' | 'custom'
 * @property {boolean} [goldenSet] - Part of 12 golden sentences
 * @property {number} createdAt - Timestamp
 * @property {number} interval - Days until next review
 * @property {number} ease - SM-2 ease factor (1.3-2.5)
 * @property {number} dueDate - Timestamp
 * @property {number} reviews - Total review count
 * @property {boolean} [deleted] - Soft delete flag
 */

/**
 * Initialize IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
export const initDB = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    const timeoutId = setTimeout(() => {
      const warning = {
        code: 'STORAGE_WARN',
        message: 'IndexedDB open is taking longer than expected',
        context: { dbName: DB_NAME, version: DB_VERSION },
        recoverable: true
      };
      logEvent('WARN', 'db-init-slow', { warning });
    }, 7000);
    
    request.onerror = () => {
      clearTimeout(timeoutId);
      const error = {
        code: 'STORAGE_ERROR',
        message: 'Failed to open IndexedDB',
        context: { dbName: DB_NAME, version: DB_VERSION },
        recoverable: false
      };
      logEvent('ERROR', 'db-init', { error });
      reject(error);
    };
    
    request.onsuccess = () => {
      clearTimeout(timeoutId);
      logEvent('INFO', 'db-init', { status: 'success' });
      resolve(request.result);
    };

    request.onblocked = () => {
      const warning = {
        code: 'STORAGE_WARN',
        message: 'IndexedDB upgrade blocked by another tab',
        context: { dbName: DB_NAME, version: DB_VERSION },
        recoverable: true
      };
      logEvent('WARN', 'db-init-blocked', { warning });
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      let cardsStore;
      
      if (!db.objectStoreNames.contains(STORES.CARDS)) {
        cardsStore = db.createObjectStore(STORES.CARDS, { keyPath: 'id' });
      } else {
        cardsStore = event.target.transaction.objectStore(STORES.CARDS);
      }
      
      if (cardsStore && !cardsStore.indexNames.contains('dueDate')) {
        cardsStore.createIndex('dueDate', 'dueDate', { unique: false });
      }
      
      if (cardsStore && !cardsStore.indexNames.contains('category')) {
        cardsStore.createIndex('category', 'category', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.REVIEWS)) {
        db.createObjectStore(STORES.REVIEWS, { keyPath: 'id' });
      }
    };
  });
};

/**
 * Save a card to IndexedDB
 * @param {Card} card
 * @returns {Promise<Card>}
 */
export const saveCard = async (card) => {
  try {
    if (useFallback) {
      return fallbackSave(STORES.CARDS, card);
    }
    
    const db = await getDB();
    if (!db) {
      return fallbackSave(STORES.CARDS, card);
    }
    const tx = db.transaction([STORES.CARDS], 'readwrite');
    const store = tx.objectStore(STORES.CARDS);
    
    return new Promise((resolve, reject) => {
      const request = store.put(card);
      
      request.onsuccess = () => {
        logEvent('INFO', 'card-save', { cardId: card.id });
        resolve(card);
      };
      
      request.onerror = () => {
        const error = {
          code: 'STORAGE_ERROR',
          message: 'Failed to save card',
          context: { cardId: card.id },
          recoverable: true
        };
        logEvent('ERROR', 'card-save', { error, cardId: card.id });
        reject(error);
      };
    });
  } catch (error) {
    logEvent('ERROR', 'card-save-catch', { error: error.message });
    throw {
      code: 'STORAGE_ERROR',
      message: 'Failed to save card',
      context: { error: error.message },
      recoverable: false
    };
  }
};

/**
 * Get a card by ID
 * @param {string} cardId
 * @returns {Promise<Card|null>}
 */
export const getCard = async (cardId) => {
  try {
    if (useFallback) {
      return fallbackGet(STORES.CARDS, cardId);
    }
    
    const db = await getDB();
    if (!db) {
      return fallbackGet(STORES.CARDS, cardId);
    }
    const tx = db.transaction([STORES.CARDS], 'readonly');
    const store = tx.objectStore(STORES.CARDS);
    
    return new Promise((resolve, reject) => {
      const request = store.get(cardId);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        const error = {
          code: 'STORAGE_ERROR',
          message: 'Failed to get card',
          context: { cardId },
          recoverable: true
        };
        logEvent('ERROR', 'card-get', { error, cardId });
        reject(error);
      };
    });
  } catch (error) {
    logEvent('ERROR', 'card-get-catch', { error: error.message });
    throw {
      code: 'STORAGE_ERROR',
      message: 'Failed to get card',
      context: { error: error.message, cardId },
      recoverable: false
    };
  }
};

/**
 * Get all cards due for review
 * @param {number} [limit] - Maximum cards to return
 * @returns {Promise<Card[]>}
 */
export const getDueCards = async (limit = 50) => {
  try {
    if (useFallback) {
      return fallbackGetDueCards(limit);
    }
    
    const db = await getDB();
    if (!db) {
      return fallbackGetDueCards(limit);
    }
    const tx = db.transaction([STORES.CARDS], 'readonly');
    const store = tx.objectStore(STORES.CARDS);
    
    return new Promise((resolve, reject) => {
      const now = Date.now();
      const request = store.index('dueDate').openCursor(null, 'next');
      const results = [];
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor && results.length < limit) {
          const card = cursor.value;
          if (!card.deleted && card.dueDate <= now) {
            results.push(card);
          }
          cursor.continue();
        } else {
          logEvent('INFO', 'due-cards-fetched', { count: results.length });
          resolve(results);
        }
      };
      
      request.onerror = () => {
        const error = {
          code: 'STORAGE_ERROR',
          message: 'Failed to fetch due cards',
          context: {},
          recoverable: true
        };
        logEvent('ERROR', 'due-cards-fetch', { error });
        reject(error);
      };
    });
  } catch (error) {
    logEvent('ERROR', 'due-cards-catch', { error: error.message });
    throw {
      code: 'STORAGE_ERROR',
      message: 'Failed to fetch due cards',
      context: { error: error.message },
      recoverable: false
    };
  }
};

/**
 * Save a session record
 * @param {Object} session
 * @returns {Promise<Object>}
 */
export const saveSession = async (session) => {
  try {
    if (useFallback) {
      return fallbackSave(STORES.SESSIONS, session);
    }
    
    const db = await getDB();
    if (!db) {
      return fallbackSave(STORES.SESSIONS, session);
    }
    const tx = db.transaction([STORES.SESSIONS], 'readwrite');
    const store = tx.objectStore(STORES.SESSIONS);
    
    return new Promise((resolve, reject) => {
      const request = store.put(session);
      
      request.onsuccess = () => {
        logEvent('INFO', 'session-save', { sessionId: session.id });
        resolve(session);
      };
      
      request.onerror = () => {
        const error = {
          code: 'STORAGE_ERROR',
          message: 'Failed to save session',
          context: { sessionId: session.id },
          recoverable: true
        };
        logEvent('ERROR', 'session-save', { error, sessionId: session.id });
        reject(error);
      };
    });
  } catch (error) {
    logEvent('ERROR', 'session-save-catch', { error: error.message });
    throw {
      code: 'STORAGE_ERROR',
      message: 'Failed to save session',
      context: { error: error.message },
      recoverable: false
    };
  }
};

/**
 * Database connection cache
 */
const getDB = async () => {
  if (useFallback) {
    return null;
  }
  
  if (dbConnection) {
    return dbConnection;
  }
  
  if (!dbInitPromise) {
    dbInitPromise = initDB();
  }
  
  try {
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve('timeout'), FALLBACK_TIMEOUT_MS);
    });
    
    const result = await Promise.race([dbInitPromise, timeoutPromise]);
    
    if (result === 'timeout') {
      enableFallback('timeout');
      return null;
    }
    
    dbConnection = result;
    return dbConnection;
  } catch (error) {
    enableFallback(error.message || 'init-failed');
    return null;
  }
};

const enableFallback = (reason) => {
  useFallback = true;
  if (!fallbackNotified) {
    logEvent('WARN', 'storage-fallback', { reason });
    fallbackNotified = true;
  }
};

const fallbackSave = (storeName, item) => {
  const storeKey = storeName === STORES.CARDS ? 'cards'
    : storeName === STORES.SESSIONS ? 'sessions'
      : 'reviews';
  
  fallbackStores[storeKey].set(item.id, { ...item });
  logEvent('WARN', 'storage-fallback-save', { store: storeKey, id: item.id });
  return item;
};

const fallbackGet = (storeName, id) => {
  const storeKey = storeName === STORES.CARDS ? 'cards'
    : storeName === STORES.SESSIONS ? 'sessions'
      : 'reviews';
  
  return fallbackStores[storeKey].get(id) || null;
};

const fallbackGetDueCards = (limit) => {
  const now = Date.now();
  const cards = Array.from(fallbackStores.cards.values())
    .filter(card => !card.deleted && card.dueDate <= now)
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, limit);
  
  logEvent('WARN', 'storage-fallback-due-cards', { count: cards.length });
  return cards;
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
