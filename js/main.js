import { Router } from './modules/router.js';
import { State } from './modules/state.js';
import { getSettings, saveSettings } from './data/localstorage.js';
import { initializeApp as initDataApp } from './data/import.js';
import {
  startSession,
  rateCurrentCard,
  endSession,
  hasMoreCards,
  getCurrentCard,
  getSessionProgress
} from './modules/session.js';
import { getDueCards } from './data/indexeddb.js';
import {
  playAudio as playAudioModule,
  preloadAudio,
  stopAllAudio,
  initTts
} from './modules/audio.js';

export const main = () => {
  const app = document.getElementById('app');
  
  const initializeApp = async () => {
    logEvent('INFO', 'app-start', { timestamp: Date.now() });
    
    const settings = await getSettings();
    State.update({ settings });
    
    Router.init();
    
    await runDataInit();
    await initTts();
    
    renderLayout();
    
    Router.subscribe((route) => {
      State.update({ currentRoute: route });
      renderRoute(route);
    });

    renderRoute(Router.currentRoute || '#home');
    window.addEventListener('beforeunload', handleBeforeUnload);
  };
  
  const renderLayout = () => {
    // Header and navigation will be managed per view for more flexibility
    // But we keep the announcer and main container
    app.innerHTML = `
      <div id="main-content" class="flex-1 dot-grid"></div>
    `;
  };
  
  const renderRoute = async (route) => {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    const latestSettings = await getSettings();
    State.update({ settings: latestSettings });
    const { settings } = State.get();
    
    if (!settings.onboardingCompleted && route !== '#onboarding') {
      Router.navigate('#onboarding');
      return;
    }
    
    if (route === '#onboarding') {
      await renderOnboarding(mainContent, settings);
    } else if (route === '#home') {
      await renderHome(mainContent, settings);
    } else if (route === '#review') {
      await renderReview(mainContent, settings);
    } else if (route === '#settings') {
      await renderSettings(mainContent, settings);
    }
    
    State.update({ currentView: route.replace('#', '') });
  };

  const renderNav = (title = '', bgColor = 'bg-violet', showBack = false) => {
    const backControl = showBack
      ? `<button class="circle-btn" id="nav-back" aria-label="Go back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>`
      : '<div aria-hidden="true" style="width: 48px; height: 48px;"></div>';

    return `
      <header class="app-nav">
        ${backControl}
        <span class="font-black text-white text-xl">${title}</span>
        <button class="circle-btn" id="nav-settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </header>
    `;
  };

  const setupNavListeners = () => {
    document.getElementById('nav-back')?.addEventListener('click', () => {
      const { currentView } = State.get();
      if (currentView === 'review') Router.navigate('#home');
      else if (currentView === 'home') Router.navigate('#onboarding');
      else if (currentView === 'settings') window.history.back();
      else window.history.back();
    });
    document.getElementById('nav-settings')?.addEventListener('click', () => {
      Router.navigate('#settings');
    });
  };
  
  const renderHome = async (container, settings) => {
    const dueCards = await getDueCards(999);
    const goldenCount = dueCards.filter(c => c.goldenSet).length;
    const coreCount = dueCards.filter(c => c.category === 'core').length;

    container.className = 'flex-1 bg-coral dot-grid';
    container.innerHTML = `
      ${renderNav('', 'bg-coral', true)}
      <div class="home-view">
        <div class="decks-headline">
          <h2>Today's practice decks</h2>
          <p>Pick a focus. Small sessions win.</p>
        </div>

        <div class="deck-grid">
          <div class="deck-card--large kawaii-card card--interactive" data-deck="daily">
            <div class="kawaii-pill bg-sunny" style="position: absolute; top: 1rem; right: 1rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              ${dueCards.length} cards
            </div>
            <img src="assets/img/deck_daily.png" alt="Daily">
            <h3>Daily Challenge</h3>
            <p>Your daily mix of cards</p>
          </div>

          <div class="deck-card--small kawaii-card card--interactive" data-deck="core">
            <img src="assets/img/deck_core.png" alt="Core">
            <div>
              <h3>Core Chunks</h3>
              <p>${coreCount} cards</p>
            </div>
          </div>

          <div class="deck-card--small kawaii-card card--interactive" data-deck="golden">
            <img src="assets/img/deck_golden.png" alt="Golden">
            <div>
              <h3>Golden Sentences</h3>
              <p>${goldenCount} cards</p>
            </div>
          </div>
        </div>
      </div>

      <div class="action-bar flex-center">
        <button class="kawaii-btn" id="quick-start">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          Start Review
        </button>
      </div>
    `;
    
    setupNavListeners();
    
    container.querySelectorAll('.card--interactive').forEach(card => {
      card.addEventListener('click', async () => {
        const deckType = card.dataset.deck;
        await startSession(settings.dailyReviewLimit, deckType);
        Router.navigate('#review');
      });
    });

    document.getElementById('quick-start').addEventListener('click', async () => {
      await startSession(settings.dailyReviewLimit, 'daily');
      Router.navigate('#review');
    });
  };

  const renderOnboarding = async (container, settings) => {
    container.className = 'flex-1 bg-violet dot-grid';
    container.innerHTML = `
      ${renderNav('', 'bg-violet')}
      <div class="flex-center" style="padding: 1rem; padding-bottom: 8rem;">
        <div class="onboarding-card kawaii-card">
          <div class="onboarding-hero">
            <img src="assets/img/onboarding_hero.png" alt="Hero">
          </div>
          <div class="onboarding-content">
            <div class="flex-center" style="justify-content: flex-start; gap: 0.5rem; margin-bottom: 1rem;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFD36A"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span class="handwritten" style="font-size: 1.5rem; color: #6A5A8F;">New!</span>
            </div>
            <h1 class="onboarding-title">Learn English like a daily power-up.</h1>
            <p class="onboarding-body">
              Mezzofanti is a spaced-repetition practice deck built for Spanish speakers. 
              Review in short bursts, listen before you read, and let the pattern stick.
            </p>
            
            <div style="margin-top: 1rem;"></div>
          </div>
        </div>
      </div>
      <div class="action-bar flex-center">
        <button class="kawaii-btn" id="onboarding-start">
          Start Learning
        </button>
      </div>
    `;

    setupNavListeners();

    document.getElementById('onboarding-start').addEventListener('click', async () => {
      await saveSettings({ onboardingCompleted: true });
      Router.navigate('#home');
    });
  };
  
  const renderReview = async (container, settings) => {
    const progress = getSessionProgress();
    if (progress.total === 0) {
      await startSession(settings.dailyReviewLimit);
    }
    
    const { reviewed, total, correct } = getSessionProgress();
    const progressPercent = total > 0 ? (reviewed / total) * 100 : 0;
    
    container.className = 'flex-1 bg-violet dot-grid';
    container.innerHTML = `
      ${renderNav('', 'bg-violet', true)}
      <div class="review-view">
        <div class="flex-center" style="gap: 0.75rem; margin-bottom: 1.5rem;">
          <div class="kawaii-pill bg-sunny">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            ${total - reviewed} left
          </div>
          <div class="kawaii-pill bg-mint">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            ${correct} correct
          </div>
        </div>

        <div class="kawaii-progress" style="max-width: var(--card-max-width);">
          <div class="kawaii-progress__fill" style="width: ${progressPercent}%"></div>
        </div>

        <div id="card-container" style="width: 100%; display: flex; justify-content: center;"></div>
      </div>

      <div class="action-bar" id="review-actions">
        <!-- Buttons injected here -->
      </div>
    `;
    
    setupNavListeners();
    await loadNextCard(settings);
  };

  const loadNextCard = async (settings) => {
    const card = getCurrentCard();
    const container = document.getElementById('card-container');
    const actionBar = document.getElementById('review-actions');
    if (!container || !actionBar) return;
    
    if (!card) {
      container.innerHTML = `
        <div class="kawaii-card text-center flex-center" style="flex-direction: column; min-height: 300px;">
          <img src="assets/img/deck_golden.png" style="width: 100px; margin-bottom: 1.5rem;">
          <h3 class="font-black text-2xl" style="color: var(--plum);">Session Complete!</h3>
          <p style="color: var(--muted-plum); margin-top: 0.5rem;">You've mastered these patterns.</p>
        </div>
      `;
      actionBar.innerHTML = `<button class="kawaii-btn" id="back-to-decks">Continue</button>`;
      document.getElementById('back-to-decks').addEventListener('click', () => Router.navigate('#home'));
      return;
    }

    const cardType = card.cardType || 'word';
    const badgeHtml = card.goldenSet ? '<div class="badge badge--golden">Golden Sentence</div>' : 
                      cardType === 'chunk' ? '<div class="badge badge--success">Chunk</div>' : '';

    container.innerHTML = `
      <div class="review-flashcard kawaii-card">
        <div>
          <span style="font-size: 0.75rem; font-weight: 800; color: var(--muted-plum); text-transform: uppercase;">Spanish</span>
          <div class="flashcard-prompt">${card.front}</div>
          ${badgeHtml}
        </div>
        
        <div id="reveal-content" class="hidden" style="margin-top: 1.5rem; border-top: 2px solid rgba(42,30,79,0.1); padding-top: 1.5rem;">
          <span style="font-size: 0.75rem; font-weight: 800; color: var(--muted-plum); text-transform: uppercase;">English</span>
          <div class="flashcard-answer">${card.back}</div>
          <div class="flashcard-ipa">${card.ipa || ''}</div>
          
          <div class="flashcard-example">
            <p>${card.context || ''}</p>
            <div class="ipa">${card.contextIpa || ''}</div>
          </div>

          <button class="kawaii-btn-secondary" style="width: 100%; margin-bottom: 1rem;" id="toggle-analysis">
            Show Explanation
          </button>
          <div id="analysis-box" class="analysis-content hidden">${card.analysisEs || card.analysisEn || ''}</div>

          <button class="kawaii-btn-secondary" style="width: 100%;" id="play-tts">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            Speak
          </button>
        </div>
      </div>
    `;

    actionBar.innerHTML = `
      <button class="kawaii-btn" id="reveal-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        Reveal Answer
      </button>
      <div id="rating-row" class="rating-buttons hidden">
        <button class="rating-btn rating-again" data-rating="0"><span style="opacity: 0.7">1</span> Again</button>
        <button class="rating-btn rating-hard" data-rating="1"><span style="opacity: 0.7">2</span> Hard</button>
        <button class="rating-btn rating-good" data-rating="2"><span style="opacity: 0.7">3</span> Good</button>
        <button class="rating-btn rating-easy" data-rating="3"><span style="opacity: 0.7">4</span> Easy</button>
      </div>
    `;

    const revealBtn = document.getElementById('reveal-btn');
    const ratingRow = document.getElementById('rating-row');
    const revealContent = document.getElementById('reveal-content');

    revealBtn.addEventListener('click', () => {
      revealBtn.classList.add('hidden');
      ratingRow.classList.remove('hidden');
      revealContent.classList.remove('hidden');
      
      if (settings.audioEnabled) {
        playAudioModule(null, card.context || card.back);
      }
    });

    document.getElementById('toggle-analysis').addEventListener('click', (e) => {
      const box = document.getElementById('analysis-box');
      box.classList.toggle('hidden');
      e.target.textContent = box.classList.contains('hidden') ? 'Show Explanation' : 'Hide Explanation';
    });

    document.getElementById('play-tts').addEventListener('click', () => {
      playAudioModule(null, card.context || card.back);
    });

    ratingRow.querySelectorAll('.rating-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rating = parseInt(btn.dataset.rating);
        await rateCurrentCard(rating);
        await renderReview(document.getElementById('main-content'), settings);
      });
    });
  };
  
  const renderSettings = async (container, settings) => {
    container.className = 'flex-1 bg-violet dot-grid';
    container.innerHTML = `
      ${renderNav('Settings', 'bg-violet', true)}
      <div class="settings-view">
        <div class="kawaii-card" style="margin-bottom: 1.5rem;">
          <label class="flex-center" style="justify-content: space-between; cursor: pointer;">
            <span class="font-bold">🔊 Audio (Text-to-Speech)</span>
            <input type="checkbox" id="audio-enabled" ${settings.audioEnabled ? 'checked' : ''} style="width: 24px; height: 24px;">
          </label>
        </div>

        <div class="kawaii-card" style="margin-bottom: 1.5rem;">
          <p class="font-bold" style="margin-bottom: 0.5rem;">Daily Review Limit</p>
          <input type="range" id="limit-range" min="5" max="100" step="5" value="${settings.dailyReviewLimit}" style="width: 100%;">
          <div class="flex-center" style="justify-content: space-between; margin-top: 0.5rem;">
            <span>5</span>
            <span class="font-black" id="limit-val">${settings.dailyReviewLimit}</span>
            <span>100</span>
          </div>
        </div>

        <div class="kawaii-card">
          <p class="font-bold" style="margin-bottom: 0.5rem;">App Info</p>
          <p style="font-size: 0.875rem; color: var(--muted-plum);">Mezzofanti uses SRS to help you master English patterns. Focus on sound before spelling.</p>
        </div>
      </div>
    `;
    
    setupNavListeners();
    
    document.getElementById('audio-enabled').addEventListener('change', async (e) => {
      await saveSettings({ audioEnabled: e.target.checked });
    });

    const range = document.getElementById('limit-range');
    range.addEventListener('input', (e) => {
      document.getElementById('limit-val').textContent = e.target.value;
    });
    range.addEventListener('change', async (e) => {
      await saveSettings({ dailyReviewLimit: parseInt(e.target.value) });
    });
  };

  const handleBeforeUnload = () => {
    stopAllAudio();
  };
  
  initializeApp().catch(error => {
    logEvent('ERROR', 'app-init', { error: error.message });
  });
};

const runDataInit = async () => {
  try {
    await initDataApp();
  } catch (error) {
    logEvent('ERROR', 'app-init-data', { error: error.message });
  }
};

const logEvent = (level, context, data) => {
  const entry = {
    level,
    timestamp: Date.now(),
    correlationId: Math.random().toString(36).substring(2, 15),
    context,
    data
  };
  console.log(JSON.stringify(entry));
};

main();
