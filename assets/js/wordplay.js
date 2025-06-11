function initWordplay() {
  console.log("[wordplay] initWordplay started");
  const wordplayHeader = document.getElementById('wordplay-header');
  if (!wordplayHeader) {
    console.error("[wordplay] ERROR: #wordplay-header not found");
    return;
  }

  const pinnedWordLi = wordplayHeader.querySelector('.pinned-word');
  const wordPileUl = wordplayHeader.querySelector('.wordpile');
  const langToggle = document.getElementById('lang-toggle-link');

  if (!pinnedWordLi || !wordPileUl) {
    console.error("[wordplay] ERROR: .pinned-word or .wordpile missing");
    return;
  }

  /* --- A. Language Toggle ---
  if (langToggle) {
    langToggle.addEventListener('click', (e) => {
      e.preventDefault();
      console.log("[wordplay] Language toggle clicked");
      document.body.classList.toggle('show-hebrew');
    });
  } else {
    console.warn("[wordplay] WARNING: #lang-toggle-link not found");
  }*/

  // --- B. Word pile click handler ---
  wordPileUl.addEventListener('click', (e) => {
    console.log("[wordplay] Word pile clicked");
    const clickedLink = e.target.closest('.word-item:not(.pinned-word) a.word');
    if (!clickedLink) {
      console.log("[wordplay] Clicked element is not a valid word link");
      return;
    }
    e.preventDefault();

    if (clickedLink.classList.contains('clicked-once')) {
      console.warn("[wordplay] Already clicked — skipping duplicate trigger");
      return;
    }
    clickedLink.classList.add('clicked-once');

    const clickedLi = clickedLink.closest('.word-item');
    const activeWordDiv = pinnedWordLi.querySelector('.word');
    if (!activeWordDiv) {
      console.error("[wordplay] ERROR: No active pinned word found");
      return;
    }

    const href = clickedLink.href;
    console.log(`[wordplay] Animating navigation to: ${href}`);

    const clickedRect = clickedLink.getBoundingClientRect();
    const activeRect = activeWordDiv.getBoundingClientRect();

    const movingToActive = clickedLink.cloneNode(true);
    const movingToPile = activeWordDiv.cloneNode(true);

    Object.assign(movingToActive.style, {
      position: 'fixed',
      top: `${clickedRect.top}px`,
      left: `${clickedRect.left}px`,
      width: `${clickedRect.width}px`,
      height: `${clickedRect.height}px`,
      margin: 0,
      zIndex: 9999,
    });

    Object.assign(movingToPile.style, {
      position: 'fixed',
      top: `${activeRect.top}px`,
      left: `${activeRect.left}px`,
      width: `${activeRect.width}px`,
      height: `${activeRect.height}px`,
      margin: 0,
      zIndex: 9998,
    });

    document.body.appendChild(movingToActive);
    document.body.appendChild(movingToPile);

    gsap.set([clickedLi, activeWordDiv], { opacity: 0 });

    console.log("[wordplay] Triggering native link click for Barba");
    setTimeout(() => clickedLink.click(), 0);

    const timeline = gsap.timeline({
      defaults: { duration: 0.7, ease: 'power2.inOut' },
      onComplete: () => {
        console.log("[wordplay] Animation complete");
        movingToActive.remove();
        movingToPile.remove();
      }
    });

    timeline.to(movingToActive, {
      x: activeRect.left - clickedRect.left,
      y: activeRect.top - clickedRect.top
    }, 0);

    timeline.to(movingToPile, {
      x: clickedRect.left - activeRect.left,
      y: clickedRect.top - activeRect.top
    }, 0);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("[wordplay] DOMContentLoaded");
  initWordplay();
});

if (window.barba) {
  barba.hooks.enter(() => {
    console.log("[wordplay] Barba enter hook triggered");
    const header = document.getElementById('wordplay-header');
    if (header) {
      header.dataset.wordplayInitialized = 'false';
    }
  });

  barba.hooks.after(() => {
    console.log("[wordplay] Barba after hook triggered");
    document.querySelectorAll('.clicked-once').forEach(el => el.classList.remove('clicked-once'));
    initWordplay();
  });
}