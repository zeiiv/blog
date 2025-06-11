/**
 * @file wordplay.js
 * @description Provides the GSAP animation function for the header word-swapping effect.
 * This function is designed to be called by a Barba.js transition.
 * @param {HTMLElement} clickedLink - The link element that was clicked.
 * @returns {gsap.core.Timeline} A GSAP timeline instance that Barba can 'await'.
 */
function createWordSwapAnimation(clickedLink) {
  console.log("[wordplay] Creating GSAP swap animation.");

  const wordplayHeader = document.getElementById('wordplay-header');
  const pinnedWordLi = wordplayHeader.querySelector('.pinned-word');
  const activeWordDiv = pinnedWordLi.querySelector('.word');
  const clickedLi = clickedLink.closest('.word-item');

  if (!activeWordDiv || !clickedLi) {
    console.error("[wordplay] Animation target elements not found.");
    return null;
  }

  clickedLink.classList.add('clicked-once');

  const clickedRect = clickedLink.getBoundingClientRect();
  const activeRect = activeWordDiv.getBoundingClientRect();
  const movingToActive = clickedLink.cloneNode(true);
  const movingToPile = activeWordDiv.cloneNode(true);

  Object.assign(movingToActive.style, {
    position: 'fixed', top: `${clickedRect.top}px`, left: `${clickedRect.left}px`,
    width: `${clickedRect.width}px`, height: `${clickedRect.height}px`,
    margin: 0, zIndex: 9999,
  });
  Object.assign(movingToPile.style, {
    position: 'fixed', top: `${activeRect.top}px`, left: `${activeRect.left}px`,
    width: `${activeRect.width}px`, height: `${activeRect.height}px`,
    margin: 0, zIndex: 9998,
  });

  document.body.appendChild(movingToActive);
  document.body.appendChild(movingToPile);
  gsap.set([clickedLi, activeWordDiv], { opacity: 0 });

  const timeline = gsap.timeline({
    defaults: { duration: 0.7, ease: 'power2.inOut' },
    onComplete: () => {
      movingToActive.remove();
      movingToPile.remove();
    }
  });

  timeline.to(movingToActive, { x: activeRect.left - clickedRect.left, y: activeRect.top - clickedRect.top }, 0);
  timeline.to(movingToPile, { x: clickedRect.left - activeRect.left, y: clickedRect.top - activeRect.top }, 0);
  
  return timeline;
}