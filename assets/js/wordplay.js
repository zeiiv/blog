//======================================================================
//  1. YOUR ORIGINAL GSAP WORD-SWAPPING ANIMATION
//  We've renamed your original function to be more specific.
//======================================================================
function initWordSwapAnimation() {
  console.log("[wordplay] Initializing custom GSAP word swap animation.");

  const wordplayHeader = document.getElementById('wordplay-header');
  if (!wordplayHeader) {
    // This is not an error, the element just might not be on this page.
    console.log("[wordplay] #wordplay-header not found on this page. Skipping swap animation.");
    return;
  }

  // --- B. Word pile click handler ---
  const wordPileUl = wordplayHeader.querySelector('.wordpile');
  if (wordPileUl) {
    wordPileUl.addEventListener('click', (e) => {
      console.log("[wordplay] Word pile clicked");
      const clickedLink = e.target.closest('.word-item:not(.pinned-word) a.word');
      if (!clickedLink) {
        return;
      }
      e.preventDefault();

      if (clickedLink.classList.contains('clicked-once')) {
        console.warn("[wordplay] Already clicked — skipping duplicate trigger");
        return;
      }
      clickedLink.classList.add('clicked-once');

      const pinnedWordLi = wordplayHeader.querySelector('.pinned-word');
      const clickedLi = clickedLink.closest('.word-item');
      const activeWordDiv = pinnedWordLi.querySelector('.word');

      if (!pinnedWordLi || !activeWordDiv) {
        console.error("[wordplay] ERROR: Critical pinned word elements are missing.");
        return;
      }
      
      console.log(`[wordplay] Animating navigation to: ${clickedLink.href}`);

      const clickedRect = clickedLink.getBoundingClientRect();
      const activeRect = activeWordDiv.getBoundingClientRect();

      const movingToActive = clickedLink.cloneNode(true);
      const movingToPile = activeWordDiv.cloneNode(true);

      Object.assign(movingToActive.style, {
        position: 'fixed',
        top: `${clickedRect.top}px`, left: `${clickedRect.left}px`,
        width: `${clickedRect.width}px`, height: `${clickedRect.height}px`,
        margin: 0, zIndex: 9999,
      });
      Object.assign(movingToPile.style, {
        position: 'fixed',
        top: `${activeRect.top}px`, left: `${activeRect.left}px`,
        width: `${activeRect.width}px`, height: `${activeRect.height}px`,
        margin: 0, zIndex: 9998,
      });

      document.body.appendChild(movingToActive);
      document.body.appendChild(movingToPile);

      gsap.set([clickedLi, activeWordDiv], { opacity: 0 });

      // Trigger the Barba navigation
      setTimeout(() => clickedLink.click(), 0);

      const timeline = gsap.timeline({
        defaults: { duration: 0.7, ease: 'power2.inOut' },
        onComplete: () => {
          movingToActive.remove();
          movingToPile.remove();
        }
      });
      timeline.to(movingToActive, { x: activeRect.left - clickedRect.left, y: activeRect.top - clickedRect.top }, 0);
      timeline.to(movingToPile, { x: clickedRect.left - activeRect.left, y: clickedRect.top - activeRect.top }, 0);
    });
  }
}

//======================================================================
//  2. THE NEW LETTER-REVEAL ANIMATION
//  This function uses the 'new WordPlay' library for a different effect.
//======================================================================
function initLetterRevealAnimation() {
  console.log("[wordplay] Initializing letter reveal animation.");
  
  const wordplayElements = document.querySelectorAll('.header__wordplay');
  if (wordplayElements.length === 0) {
    // Not an error, this effect might not be used on every page.
    console.log("[wordplay] '.header__wordplay' not found on this page. Skipping letter reveal.");
    return;
  }

  wordplayElements.forEach(element => {
    // This is the command that turns the letter animation ON.
    new WordPlay(element, {
      className: "header__wordplay",
      mode: "letter",
      speed: 0.5,
      delay: 0.025
    });
  });
}

//======================================================================
//  3. MASTER INITIALIZATION AND EVENT LISTENERS
//  This single, clean set of listeners calls all our functions.
//======================================================================
function initializePageAnimations() {
  // This one function will run everything we need.
  initWordSwapAnimation();
  initLetterRevealAnimation();
}

// Run all animations when the page first loads.
document.addEventListener('DOMContentLoaded', initializePageAnimations);

// Run all animations after every page transition (if using Barba.js).
if (window.barba) {
  barba.hooks.after(() => {
    // Reset the 'clicked-once' state from your original code
    document.querySelectorAll('.clicked-once').forEach(el => el.classList.remove('clicked-once'));
    // Re-run all initializations for the new page
    initializePageAnimations();
  });
}