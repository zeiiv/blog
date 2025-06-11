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
  const allPileItems = Array.from(wordPileUl.querySelectorAll('.word-item'));
  const clickedLi = clickedLink.closest('.word-item');

  // --- DEBUG: Safety check for essential elements.
  if (!activeWordDiv || !clickedLi || !wordPileUl) {
    console.error("[wordplay] Animation aborted: A critical element (activeWord, clickedLi, or wordPileUl) was not found.");
    return null;
  }
  
  // --- DEBUG: Mark the link to prevent re-triggering issues.
  clickedLink.classList.add('clicked-once');

  // Get the initial positions of the two main words.
  const clickedRect = clickedLink.getBoundingClientRect();
  const activeRect = activeWordDiv.getBoundingClientRect();

  // Create clones of the moving words. These are what we'll actually animate.
  const movingToActive = clickedLink.cloneNode(true); // The selected word moving to the pinned spot.
  const movingToPile = activeWordDiv.cloneNode(true); // The old pinned word moving to the pile.
  
  // ===================================================================================
  // PHASE 1: "LIFT-OFF" (Anticipation)
  // ===================================================================================

  const masterTimeline = gsap.timeline({
    // --- DEBUG: Add callbacks to log the progress of the master timeline.
    onStart: () => console.log('[wordplay] Master timeline started.'),
    onComplete: () => {
      // Cleanup: Remove the cloned elements from the page after the animation is fully complete.
      movingToActive.remove();
      movingToPile.remove();
      console.log('[wordplay] 4. Animation complete. Clones removed.');
    }
  });

  // Fade out all the words in the pile that AREN'T the one we clicked.
  const otherPileItems = allPileItems.filter(item => item !== clickedLi);
  masterTimeline.to(otherPileItems, {
    opacity: 0.5,
    duration: 0.2,
    ease: 'power1.in'
  }, 0); // The '0' at the end means this animation starts at the very beginning of the timeline.

  // Position the clones exactly on top of their original counterparts.
  // We use `position: fixed` to ensure they don't move with any page scroll.
  gsap.set([movingToActive, movingToPile], { position: 'fixed', margin: 0 });
  gsap.set(movingToActive, { top: clickedRect.top, left: clickedRect.left, width: clickedRect.width, height: clickedRect.height });
  gsap.set(movingToPile, { top: activeRect.top, left: activeRect.left, width: activeRect.width, height: activeRect.height });

  // Add clones to the body and hide the originals.
  document.body.appendChild(movingToActive);
  document.body.appendChild(movingToPile);
  gsap.set([clickedLi, activeWordDiv], { opacity: 0 });
  
  // "Pop" the active words by scaling them and adding a shadow.
  masterTimeline.to([movingToActive, movingToPile], {
    scale: 1.1,
    duration: 0.2,
    ease: 'power2.out',
    onStart: () => {
        // --- DEBUG: Add a class to apply CSS filters like drop-shadow.
        movingToActive.classList.add('word-clone--active');
        movingToPile.classList.add('word-clone--active');
        console.log('[wordplay] 2. Lift-Off: Words have "popped".');
    }
  }, 0);

  // ===================================================================================
  // PHASE 2: "THE SAFE TRAVEL" (Main Action)
  // ===================================================================================

  // --- DEBUG: Define the travel floors. These are vertical offsets from the original line.
  const travelFloor1 = 50;  // Path for the word moving TO the pile.
  const travelFloor2 = 100; // Path for the word moving TO the pinned position.
  
  const travelDuration = 0.8; // The duration for the main travel animation.

  // --- Animate the OLD PINNED word TO the PILE ---
  masterTimeline.to(movingToPile, {
    // 1. Drop down to its travel floor.
    y: `+=${travelFloor1}`,
    // 2. Move horizontally to its new destination at the front of the pile.
    x: clickedRect.left - activeRect.left, // Destination is where the clicked word was.
    scale: 0.9, // Shrink it slightly to give a sense of depth.
    duration: travelDuration,
    ease: 'power2.inOut'
  }, ">-0.1"); // The ">-0.1" staggers the start time slightly after the "pop".

  // --- Animate the NEW word TO the PINNED position ---
  masterTimeline.to(movingToActive, {
    // 1. Drop down to ITS travel floor.
    y: `+=${travelFloor2}`,
    // 2. Move horizontally to the pinned word's original spot.
    x: activeRect.left - clickedRect.left,
    scale: 1.2, // Make it slightly larger as it comes to the foreground.
    duration: travelDuration,
    ease: 'power2.inOut'
  }, "<"); // The "<" makes this animation start at the same time as the previous one.

  // --- Animate the PILE REARRANGING itself ---
  // Calculate the space that needs to be filled.
  const gapWidth = clickedRect.width + parseFloat(getComputedStyle(clickedLi).marginRight);
  const itemsToMove = allPileItems.slice(allPileItems.indexOf(clickedLi) + 1);

  if (itemsToMove.length > 0) {
    // --- DEBUG: Log which items are being moved to close the gap.
    console.log(`[wordplay] Closing gap. Moving ${itemsToMove.length} items left by ${gapWidth}px.`);
    masterTimeline.to(itemsToMove, {
        x: `-=${gapWidth}`,
        duration: travelDuration * 0.8, // Make it slightly faster than the main travel.
        ease: 'power2.inOut'
    }, "<+0.1"); // Start this just after the main travel begins.
  }

  // ===================================================================================
  // PHASE 3: "THE LANDING" (Resolution)
  // ===================================================================================
  
  // Animate the words moving from their travel floors back up to their final resting spots.
  masterTimeline.to([movingToActive, movingToPile], {
    y: 0, // Reset the vertical travel.
    scale: 1, // Reset the scale.
    duration: 0.3,
    ease: 'back.out(1.7)', // A nice "settling" ease.
    onStart: () => {
        // --- DEBUG: Announce the landing phase.
        console.log('[wordplay] 3. Landing: Words are settling into place.');
        movingToActive.classList.remove('word-clone--active');
        movingToPile.classList.remove('word-clone--active');
    }
  });

  // Fade the other pile words back in.
  masterTimeline.to(otherPileItems, {
    opacity: 1,
    duration: 0.3,
    ease: 'power1.out'
  }, "<"); // Start at the same time as the landing.

  return masterTimeline;
}
