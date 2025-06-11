/**
 * @file wordplay.js
 * @description Provides the GSAP animation function for the header word-swapping effect.
 * This function implements a 3-phase animation plan for a fluid and choreographed feel.
 * @param {HTMLElement} clickedLink - The link element that was clicked.
 * @returns {gsap.core.Timeline} A GSAP timeline instance that Barba can 'await'.
 */
function createWordSwapAnimation(clickedLink) {
  // --- DEBUG: Announce the start of the animation creation.
  console.log(`[wordplay] 1. Creating GSAP swap animation for "${clickedLink.textContent.trim()}".`);

  // ===================================================================================
  // SETUP: Gather all elements and measurements needed for the animation.
  // ===================================================================================

  const wordplayHeader = document.getElementById('wordplay-header');
  const pinnedWordLi = wordplayHeader.querySelector('.pinned-word');
  const activeWordDiv = pinnedWordLi.querySelector('.word');
  const wordPileUl = wordplayHeader.querySelector('.wordpile');
  
  // --- FIX IS HERE: We now specifically EXCLUDE the .pinned-word from the pile list. ---
  const allPileItems = Array.from(wordPileUl.querySelectorAll('.word-item:not(.pinned-word)'));
  const clickedLi = clickedLink.closest('.word-item');

  // --- DEBUG: Safety check for essential elements.
  if (!activeWordDiv || !clickedLi || !wordPileUl) {
    console.error("[wordplay] Animation aborted: A critical element was not found.");
    return null;
  }
  
  clickedLink.classList.add('clicked-once');

  const clickedRect = clickedLink.getBoundingClientRect();
  const activeRect = activeWordDiv.getBoundingClientRect();

  const movingToActive = clickedLink.cloneNode(true);
  const movingToPile = activeWordDiv.cloneNode(true);
  
  // ===================================================================================
  // PHASE 1: "LIFT-OFF" (Anticipation)
  // ===================================================================================

  const masterTimeline = gsap.timeline({
    onStart: () => console.log('[wordplay] Master timeline started.'),
    onComplete: () => {
      movingToActive.remove();
      movingToPile.remove();
      // Restore opacity on the original items just in case.
      gsap.set([clickedLi, activeWordDiv, ...allPileItems], { opacity: 1 });
      console.log('[wordplay] 4. Animation complete. Clones removed.');
    }
  });

  // Fade out all the words in the pile that AREN'T the one we clicked.
  const otherPileItems = allPileItems.filter(item => item !== clickedLi);
  masterTimeline.to(otherPileItems, {
    opacity: 0.5,
    duration: 0.2,
    ease: 'power1.in'
  }, 0);

  gsap.set([movingToActive, movingToPile], { position: 'fixed', margin: 0, whiteSpace: 'nowrap' });
  gsap.set(movingToActive, { top: clickedRect.top, left: clickedRect.left, width: clickedRect.width, height: clickedRect.height });
  gsap.set(movingToPile, { top: activeRect.top, left: activeRect.left, width: activeRect.width, height: activeRect.height });

  document.body.appendChild(movingToActive);
  document.body.appendChild(movingToPile);
  gsap.set([clickedLi, activeWordDiv], { opacity: 0 });
  
  masterTimeline.to([movingToActive, movingToPile], {
    scale: 1.1,
    duration: 0.2,
    ease: 'power2.out',
    onStart: () => {
      movingToActive.classList.add('word-clone--active');
      movingToPile.classList.add('word-clone--active');
      console.log('[wordplay] 2. Lift-Off: Words have "popped".');
    }
  }, 0);

  // ===================================================================================
  // PHASE 2: "THE SAFE TRAVEL" (Main Action)
  // ===================================================================================

  const travelFloor1 = 50;
  const travelFloor2 = 100;
  const travelDuration = 0.8;

  masterTimeline.to(movingToPile, {
    y: `+=${travelFloor1}`,
    x: clickedRect.left - activeRect.left,
    scale: 0.9,
    duration: travelDuration,
    ease: 'power2.inOut'
  }, ">-0.1");

  masterTimeline.to(movingToActive, {
    y: `+=${travelFloor2}`,
    x: activeRect.left - clickedRect.left,
    scale: 1.2,
    duration: travelDuration,
    ease: 'power2.inOut'
  }, "<");

  // --- Animate the PILE REARRANGING itself ---
  const clickedIndex = allPileItems.findIndex(item => item === clickedLi);
  // We only need to move the items that are BETWEEN the pinned word's new spot (index 0) and the clicked word's old spot.
  // However, a simpler visual is to just close the gap where the clicked word was.
  const itemsToShiftLeft = allPileItems.slice(clickedIndex + 1);
  const gapWidth = clickedRect.width + parseFloat(getComputedStyle(clickedLi).marginLeft);

  if (itemsToShiftLeft.length > 0) {
    console.log(`[wordplay] Closing gap. Shifting ${itemsToShiftLeft.length} items left.`);
    masterTimeline.to(itemsToShiftLeft, {
      x: `-=${gapWidth}`,
      duration: travelDuration * 0.8,
      ease: 'power2.inOut'
    }, "<+0.1");
  }

  // ===================================================================================
  // PHASE 3: "THE LANDING" (Resolution)
  // ===================================================================================
  
  masterTimeline.to([movingToActive, movingToPile], {
    y: 0,
    scale: 1,
    duration: 0.3,
    ease: 'back.out(1.7)',
    onStart: () => {
      console.log('[wordplay] 3. Landing: Words are settling.');
      movingToActive.classList.remove('word-clone--active');
      movingToPile.classList.remove('word-clone--active');
    }
  });

  masterTimeline.to(otherPileItems, {
    opacity: 1,
    duration: 0.3,
    ease: 'power1.out'
  }, "<");

  return masterTimeline;
}

