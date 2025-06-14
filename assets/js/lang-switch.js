/**
 * Wordplay Header & Language Switch Interaction (v4 - Unified & Corrected)
 *
 * This single script manages all header interactions:
 * 1. The "musical chairs" navigation animation.
 * 2. The 3D language-flip effect.
 *
 * It is designed to work with Barba.js by re-initializing all listeners
 * after every page transition, ensuring functionality is never lost.
 */

function initWordplayAndLangSwitch() {
  const wordplayHeader = document.getElementById('wordplay-header');
  if (!wordplayHeader) {
    console.error('Wordplay Critical: Header element #wordplay-header not found.');
    return;
  }

  // Prevent re-attaching listeners on the same element, which can cause issues.
  if (wordplayHeader.dataset.wordplayInitialized === 'true') {
    return;
  }
  wordplayHeader.dataset.wordplayInitialized = 'true';

  const pinnedWordLi = wordplayHeader.querySelector('.pinned-word');
  const body = document.body;
  const html = document.documentElement;

  // --- 1. Language Switching Logic (from your original lang-switch.js) ---

  function setStoredLanguage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Could not access localStorage. Language preference will not be saved.', e);
    }
  }

  function getStoredLanguage(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('Could not access localStorage.', e);
      return null;
    }
  }

  function applyLanguage(lang) {
    const isHebrew = lang === 'he';
    body.classList.toggle('show-hebrew', isHebrew);
    html.setAttribute('lang', isHebrew ? 'he' : 'en');
    html.setAttribute('dir', isHebrew ? 'rtl' : 'ltr');
    setStoredLanguage('language', isHebrew ? 'he' : 'en');
  }

  // --- 2. Master Event Handler (Event Delegation) ---

  wordplayHeader.addEventListener('click', function (e) {
    const targetLink = e.target.closest('a');
    if (!targetLink) return;

    // --- Handle Language Toggle Click ---
    if (targetLink.id === 'lang-toggle-link') {
      e.preventDefault();
      const currentLang = body.classList.contains('show-hebrew') ? 'en' : 'he';
      applyLanguage(currentLang);
      return; // Stop further execution
    }

    // --- Handle Navigation Word Click ---
    const isNavWord = targetLink.closest('.word-item:not(.pinned-word)');
    if (isNavWord) {
      e.preventDefault();
      const clickedLi = isNavWord;
      const clickedLink = targetLink;
      const activeWordDiv = pinnedWordLi.querySelector('.word:not(a .word)');

      if (!activeWordDiv) return;

      // Start the animation and navigation logic
      const clickedRect = clickedLink.getBoundingClientRect();
      const activeRect = activeWordDiv.getBoundingClientRect();
      const firstPileItem = wordplayHeader.querySelector('.word-item:not(.pinned-word)');
      const pileReturnRect = firstPileItem.getBoundingClientRect();

      const movingToActive = clickedLink.cloneNode(true);
      const movingToPile = activeWordDiv.cloneNode(true);

      gsap.set([movingToActive, movingToPile], { position: 'fixed', margin: 0, zIndex: 100 });
      gsap.set(movingToActive, { top: clickedRect.top, left: clickedRect.left, width: clickedRect.width, height: clickedRect.height });
      gsap.set(movingToPile, { top: activeRect.top, left: activeRect.left, width: activeRect.width, height: activeRect.height });

      document.body.appendChild(movingToActive);
      document.body.appendChild(movingToPile);
      gsap.set([clickedLi, activeWordDiv], { opacity: 0 });

      gsap.to(movingToActive, { x: activeRect.left - clickedRect.left, y: activeRect.top - clickedRect.top, duration: 0.7, ease: 'power2.inOut' });

      gsap.to(movingToPile, {
        x: pileReturnRect.left - activeRect.left,
        y: pileReturnRect.top - activeRect.top,
        duration: 0.7,
        ease: 'power2.inOut',
        onComplete: function() {
          const newActiveWordDiv = document.createElement('div');
          newActiveWordDiv.className = 'word';
          newActiveWordDiv.innerHTML = clickedLink.innerHTML;
          newActiveWordDiv.dataset.url = clickedLink.href;

          const newLinkForPile = document.createElement('a');
          newLinkForPile.className = 'word';
          newLinkForPile.href = activeWordDiv.dataset.url || '#';
          newLinkForPile.innerHTML = activeWordDiv.innerHTML;

          const newLiForPile = document.createElement('li');
          newLiForPile.className = 'word-item';
          newLiForPile.appendChild(newLinkForPile);

          activeWordDiv.replaceWith(newActiveWordDiv);
          clickedLi.replaceWith(newLiForPile);

          movingToActive.remove();
          movingToPile.remove();
          gsap.set([newLiForPile, newActiveWordDiv], { opacity: 1 });

          if (window.barba) {
            clickedLink.click();
          } else {
            window.location.href = clickedLink.href;
          }
        }
      });
    }
  });

  // --- 3. Initial State Setup ---
  // Set language on first load (for non-Barba visits)
  const savedLang = getStoredLanguage('language') || 'en';
  applyLanguage(savedLang);
}


// --- 4. Barba.js Integration ---
// This ensures that our init function runs on the first page load
// AND after every subsequent page transition.

document.addEventListener('DOMContentLoaded', initWordplayAndLangSwitch);

if (window.barba) {
  barba.hooks.after(function() {
    // Un-set the initialized flag on the header of the *previous* page's DOM
    // This is not strictly necessary but is good practice.
    // The main thing is that the *new* page's header won't have the flag yet.
    initWordplayAndLangSwitch();
  });
}
