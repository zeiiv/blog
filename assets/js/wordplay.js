/**
 * file wordplay.js
 * description Provides the GSAP animation function for the header word-swapping effect.
 * This function implements a 3-phase animation plan for a fluid and choreographed feel.
 * param {HTMLElement} clickedLink - The link element that was clicked.
 * returns {gsap.core.Timeline} A GSAP timeline instance that Barba can 'await'.
 */
/*
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(Flip);
*/

function createWordSwapAnimation(clickedLink) {
  console.log(`[wordplay] FLIP: Swapping "${clickedLink.textContent.trim()}"`);

  const wordplayHeader = document.getElementById('wordplay-header');
  const clickedItem = clickedLink.closest('.word-item');
  const activeItem = wordplayHeader.querySelector('.zone-pinned .word-item');
  const pileZone = wordplayHeader.querySelector('.zone-pile');
  const pinnedZone = wordplayHeader.querySelector('.zone-pinned');

  if (!clickedItem || !activeItem || !pileZone || !pinnedZone) {
    console.error('[wordplay] Flip animation aborted: missing elements.');
    return null;
  }

  // Get the Flip state before DOM changes
  const flipState = Flip.getState('.wordplay-zone .word-item');

  // Move the clicked word to the pinned zone
  pinnedZone.innerHTML = '';
  pinnedZone.appendChild(clickedItem);

  // Move the previously pinned word to the pile
  pileZone.appendChild(activeItem);

  // Animate the transition
  Flip.from(flipState, {
    duration: 0.8,
    ease: 'power2.inOut',
    absolute: true,
    stagger: 0.02,
    onEnter: el => gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3 }),
    onLeave: el => gsap.to(el, { opacity: 0, duration: 0.3 }),
    onComplete: () => {
      console.log('[wordplay] FLIP animation complete.');
    }
  });

  return true;
}


document.addEventListener('DOMContentLoaded', () => {
  const wordplayHeader = document.getElementById('wordplay-header');
  if (!wordplayHeader) return;

  if (wordplayHeader.dataset.init === 'true') return;
  wordplayHeader.dataset.init = 'true';

  wordplayHeader.addEventListener('click', (e) => {
    const clickedLink = e.target.closest('.word');
    if (!clickedLink) return;

    const currentlyPinned = wordplayHeader.querySelector('.zone-pinned .word');
    if (currentlyPinned === clickedLink) {
      console.log('[wordplay] Clicked pinned word — no action taken.');
      return;
    }

    console.log('[wordplay] Clicked:', clickedLink.textContent);
    createWordSwapAnimation(clickedLink);
  });
});