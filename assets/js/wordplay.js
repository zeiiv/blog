/**
 * wordplay.js
 * Replaces Flip animation with native animateWordSwap choreography.
 */

document.addEventListener('DOMContentLoaded', () => {
  const wordplayHeader = document.getElementById('wordplay-header');

  if (!wordplayHeader) {
    console.warn('[wordplay] wordplay-header element with ID "wordplay-header" not found. Script will not run.');
    return;
  }

  if (wordplayHeader.dataset.init === 'true') {
    console.log('[wordplay] wordplay-header script already initialized. Skipping re-initialization.');
    return;
  }
  wordplayHeader.dataset.init = 'true';

  wordplayHeader.addEventListener('click', (e) => {
    const clickedItem = e.target.closest('.word-item');
    if (!clickedItem) {
      console.log('[wordplay] Click event detected, but not on a .word-item element.');
      return;
    }

    const currentlyPinned = wordplayHeader.querySelector('.zone-pinned .word-item');
    if (currentlyPinned === clickedItem) {
      console.log('[wordplay] Clicked item is already the currently pinned item. No animation needed.');
      return;
    }

    const innerLink = clickedItem.querySelector('.word');
    if (!innerLink || !innerLink.href) {
      console.warn('[wordplay] The clicked .word-item does not contain a valid link element (.word with href). Aborting.');
      return;
    }

    e.preventDefault();

    const pileZone = wordplayHeader.querySelector('.zone-pile');
    const pinnedZone = wordplayHeader.querySelector('.zone-pinned');
    const pileItems = pileZone.querySelectorAll('.word-item');

    // Trigger native word animation
    animateWordSwap({
      selectedItem: clickedItem,
      pinnedItem: currentlyPinned,
      pileItems,
      pileZone,
      pinnedZone
    });

    // Trigger navigation shortly after animation starts
    setTimeout(() => {
      if (typeof barba !== 'undefined' && typeof barba.go === 'function') {
        console.log('[wordplay] Navigating with Barba:', innerLink.href);
        barba.go(innerLink.href);
      } else {
        console.warn('[wordplay] Barba.js not detected or not ready. Navigating directly.');
        window.location.href = innerLink.href;
      }
    }, 50);
  });
});
