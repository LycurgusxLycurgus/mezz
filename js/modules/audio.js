/**
 * Audio Module
 * Handles playback, preload, and error recovery for audio assets
 */

const audioCache = new Map();
let currentAudio = null;
const USE_TTS_ONLY = true;

/**
 * Initialize TTS voices and log availability
 * @returns {Promise<number>}
 */
export const initTts = async () => {
  if (!('speechSynthesis' in window)) {
    logEvent('WARN', 'audio-tts-init', { error: 'speechSynthesis-unavailable' });
    return 0;
  }
  
  const voices = await ensureVoices();
  logEvent('INFO', 'audio-tts-init', { voiceCount: voices.length });
  return voices.length;
};

/**
 * Preload audio files into cache
 * @param {string[]} urls
 * @returns {Promise<void>}
 */
export const preloadAudio = async (urls = []) => {
  if (USE_TTS_ONLY) {
    return;
  }
  urls.forEach((url) => {
    if (!url || audioCache.has(url)) return;
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.addEventListener('error', () => {
      logEvent('WARN', 'audio-load', { audioUrl: url, error: 'load-error' });
      audioCache.delete(url);
    });
    audioCache.set(url, audio);
  });
};

/**
 * Play audio by URL
 * @param {string} url
 * @param {string} fallbackText
 * @param {{ onEnd?: Function, onStart?: Function }} [options]
 * @returns {Promise<void>}
 */
export const playAudio = async (url, fallbackText = '', options = {}) => {
  const { onEnd, onStart } = options;
  logEvent('INFO', 'audio-play-request', { audioUrl: url, fallbackTextLength: fallbackText.length });
  if (USE_TTS_ONLY) {
    await playSpeechFallback(fallbackText, { onEnd, onStart });
    return;
  }
  if (!url) {
    logEvent('WARN', 'audio-play', { audioUrl: url, error: 'missing-url' });
    return playSpeechFallback(fallbackText, { onEnd, onStart });
  }
  
  try {
    const audio = audioCache.get(url) || new Audio(url);
    audioCache.set(url, audio);
    
    if (currentAudio && currentAudio !== audio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    
    currentAudio = audio;
    audio.currentTime = 0;
    if (onStart) {
      onStart();
    }
    audio.onended = () => {
      if (onEnd) {
        onEnd();
      }
    };
    await audio.play();
    
    logEvent('INFO', 'audio-play', { audioUrl: url });
  } catch (error) {
    logEvent('WARN', 'audio-play', { audioUrl: url, error: error.message });
    await playSpeechFallback(fallbackText, { onEnd, onStart });
  }
};

const playSpeechFallback = async (text, options = {}) => {
  const { onEnd, onStart } = options;
  if (!text) {
    announce('Audio unavailable. Continue with text only.');
    return;
  }
  
  if (!('speechSynthesis' in window)) {
    logEvent('WARN', 'audio-tts', { error: 'speechSynthesis-unavailable' });
    announce('Audio unavailable. Continue with text only.');
    return;
  }
  
  try {
    const voices = await ensureVoices();
    if (!voices.length) {
      logEvent('WARN', 'audio-tts', { error: 'no-voices' });
      announce('Audio unavailable. Continue with text only.');
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    
    const preferredVoice = voices.find((voice) => voice.lang === 'en-US') || voices[0];
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.onend = () => {
      logEvent('INFO', 'audio-tts-end', { textLength: text.length });
      if (onEnd) {
        onEnd();
      }
    };
    utterance.onerror = (event) => {
      logEvent('WARN', 'audio-tts-error', { error: event.error || 'tts-error' });
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    if (onStart) {
      onStart();
    }
    window.speechSynthesis.speak(utterance);
    logEvent('INFO', 'audio-tts', { textLength: text.length, voice: utterance.voice?.name });
  } catch (error) {
    logEvent('WARN', 'audio-tts', { error: error.message });
    announce('Audio unavailable. Continue with text only.');
  }
};

const ensureVoices = () => {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      logEvent('INFO', 'audio-tts-voices', { count: voices.length });
      resolve(voices);
      return;
    }
    
    let resolved = false;
    const handleVoicesChanged = () => {
      const updatedVoices = window.speechSynthesis.getVoices();
      if (!resolved && updatedVoices.length) {
        resolved = true;
        logEvent('INFO', 'audio-tts-voices', { count: updatedVoices.length });
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        resolve(updatedVoices);
      }
    };
    
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        resolve(window.speechSynthesis.getVoices());
      }
    }, 1500);
  });
};

/**
 * Stop all audio playback
 */
export const stopAllAudio = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  currentAudio = null;
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
