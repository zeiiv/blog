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
*/
gsap.registerPlugin(Flip);


function createWordSwapAnimation(clickedItem) {
  console.log(`[wordplay] FLIP: Swapping "${clickedItem.textContent.trim()}"`);

  const wordplayHeader = document.getElementById('wordplay-header');
  const activeItem = wordplayHeader.querySelector('.zone-pinned .word-item');
  const pileZone = wordplayHeader.querySelector('.zone-pile');
  const pinnedZone = wordplayHeader.querySelector('.zone-pinned');

  console.log("[wordplay] Debug Info:");
  console.log("clickedItem:", clickedItem);
  console.log("activeItem:", activeItem);
  console.log("pileZone:", pileZone);
  console.log("pinnedZone:", pinnedZone);

  if (!clickedItem || !activeItem || !pileZone || !pinnedZone) {
    console.error('[wordplay] Flip animation aborted: one or more elements are missing.');
    return null;
  }

  // Flip state capture 
  // const flipState = Flip.getState('.wordplay-zone .word-item');
  const flipState = Flip.getState([clickedItem, activeItem]);

  // DOM swap
  console.log('Count pinned word-item:', wordplayHeader.querySelectorAll('.zone-pinned .word-item').length);
  console.log('Before swap - pinned children:', pinnedZone.children);
  console.log('clickedItem parent:', clickedItem.parentNode);
  console.log('activeItem parent:', activeItem ? activeItem.parentNode : null);
  pinnedZone.replaceChild(clickedItem, activeItem);
  pileZone.appendChild(activeItem);

  // Animate
  flipState.targets.forEach(el => {
    console.log('Moving element:', el, el.getBoundingClientRect());
    el.style.zIndex = 10;
  });
  Flip.from(flipState, {
    duration: 0.8,
    ease: 'power2.inOut',
    absolute: true,
    scale: true,
    stagger: 0.02,
    onEnter: el => gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3 }),
    onLeave: el => gsap.to(el, { opacity: 0, duration: 0.3 }),
    onComplete: () => {
      flipState.targets.forEach(el => {
        el.style.zIndex = '';
      });
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
    const clickedItem = e.target.closest('.word-item');
    if (!clickedItem) return;

    const currentlyPinned = wordplayHeader.querySelector('.zone-pinned .word-item');
    if (currentlyPinned === clickedItem) {
      console.log('[wordplay] Clicked pinned word — no action taken.');
      return;
    }

    console.log('[wordplay] Clicked:', clickedItem.textContent);

    const innerLink = clickedItem.querySelector('.word');
    if (!innerLink) return;

    const animation = createWordSwapAnimation(clickedItem);

    // Delay navigation until animation completes (if Flip worked)
    if (animation !== null) {
      setTimeout(() => {
        window.location.href = innerLink.href;
      }, 100); // match Flip duration
    }
  });
});