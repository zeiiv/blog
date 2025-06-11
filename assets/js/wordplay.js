/**
 * file wordplay.js
 * description Provides the GSAP animation function for the header word-swapping effect.
 * This function implements a 3-phase animation plan for a fluid and choreographed feel.
 * param {HTMLElement} clickedLink - The link element that was clicked.
 * returns {gsap.core.Timeline|null} A GSAP timeline instance if successful, null otherwise.
 */

// Ensure GSAP and Flip plugin are registered.
// In a Jekyll environment, these might be loaded globally or through a build process.
// The commented-out imports below are typical for module-based JS but might not be
// needed if GSAP is already a global variable.
/*
import { gsap } from "gsap";
import { Flip } = from "gsap/Flip";
*/
gsap.registerPlugin(Flip);
barba.init();

/**
 * Creates and plays a GSAP Flip animation to swap the clicked word-item
 * with the currently pinned word-item in the header.
 * param {HTMLElement} clickedItem The .word-item element that was clicked.
 * returns {gsap.core.Timeline|null} A GSAP timeline instance if the animation
 * is successfully set up, otherwise null.
 */
function createWordSwapAnimation(clickedItem) {
  console.log(`[wordplay] FLIP: Attempting swap for "${clickedItem.textContent.trim()}"`);

  const wordplayHeader = document.getElementById('wordplay-header');
  const activeItem = wordplayHeader.querySelector('.zone-pinned .word-item');
  const pileZone = wordplayHeader.querySelector('.zone-pile');
  const pinnedZone = wordplayHeader.querySelector('.zone-pinned');

  // Log debug information to help diagnose issues
  console.log("[wordplay] Debug Info for createWordSwapAnimation:");
  console.log("clickedItem:", clickedItem);
  console.log("activeItem (currently pinned):", activeItem);
  console.log("pileZone:", pileZone);
  console.log("pinnedZone:", pinnedZone);

  // Abort if essential elements are missing
  if (!clickedItem || !activeItem || !pileZone || !pinnedZone) {
    console.error('[wordplay] Flip animation aborted: one or more required elements are missing from the DOM.');
    return null;
  }

  // Ensure clickedItem is not already the active item (handled by event listener, but good to double check)
  if (clickedItem === activeItem) {
    console.log('[wordplay] Clicked item is already pinned, no swap needed.');
    return null;
  }

  // --- Step 1: Capture the current state of elements before DOM changes ---
  // Flip.getState needs to capture the position/size of elements *before* they are moved.
  // We are interested in the states of both the clicked item and the active item.
  const flipState = Flip.getState([clickedItem, activeItem]);

  // --- Step 2: Perform the DOM manipulations ---
  // Move the clickedItem (from pileZone) to the pinnedZone.
  // This implicitly removes clickedItem from pileZone.
  pinnedZone.replaceChild(clickedItem, activeItem);

  // Move the previously activeItem (now detached) to the pileZone.
  pileZone.appendChild(activeItem);

  console.log('After DOM swap - pinned children count:', pinnedZone.children.length);
  console.log('After DOM swap - pile children count:', pileZone.children.length);


  // --- Step 3: Animate from the captured state to the new state ---
  // The 'Flip.from' method animates elements from their 'old' state (captured by Flip.getState)
  // to their 'new' state (after DOM manipulations).
  const animationTimeline = Flip.from(flipState, {
    duration: 0.8, // Animation duration in seconds. Make sure this is long enough!
    ease: 'power2.inOut', // Easing function for smoother motion
    absolute: true, // Ensures elements are positioned absolutely during the flip for smooth movement
    // scale: true, // Removed scale: true unless explicit scaling is desired for the transition.
                  // If elements should scale, re-add this and test.
    stagger: 0.02, // Small delay between individual elements animating, if multiple.
    
    // Callbacks for elements entering or leaving the viewport/scope of the flip
    onEnter: el => {
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      el.style.zIndex = 10; // Bring clicked item to front during animation
    },
    onLeave: el => {
      gsap.to(el, { opacity: 0, duration: 0.3 });
    },
    
    // Callback when the entire Flip animation is complete
    onComplete: () => {
      // Clean up inline styles like z-index after the animation
      flipState.targets.forEach(el => {
        el.style.zIndex = ''; // Reset z-index
      });
      console.log('[wordplay] FLIP animation complete.');
    }
  });

  return animationTimeline; // Return the GSAP timeline instance
}


// Listen for the DOM to be fully loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', () => {
  const wordplayHeader = document.getElementById('wordplay-header');
  
  // Exit if the wordplay header element is not found on the page
  if (!wordplayHeader) {
    console.warn('[wordplay] wordplay-header element with ID "wordplay-header" not found. Script will not run.');
    return;
  }

  // Prevent the script from running multiple times if included in a way that allows it
  if (wordplayHeader.dataset.init === 'true') {
    console.log('[wordplay] wordplay-header script already initialized. Skipping re-initialization.');
    return;
  }
  wordplayHeader.dataset.init = 'true'; // Mark the header as initialized

  // Add a click event listener to the entire wordplay header
  wordplayHeader.addEventListener('click', (e) => {
    // Find the closest .word-item ancestor of the clicked element
    const clickedItem = e.target.closest('.word-item');
    
    // If no .word-item was clicked, do nothing
    if (!clickedItem) {
      console.log('[wordplay] Click event detected, but not on a .word-item element.');
      return;
    }

    // Identify the currently pinned item in the 'zone-pinned'
    const currentlyPinned = wordplayHeader.querySelector('.zone-pinned .word-item');

    // If the clicked item is already the pinned item, no action is needed
    if (currentlyPinned === clickedItem) {
      console.log('[wordplay] Clicked item is already the currently pinned item. No animation needed.');
      return;
    }

    console.log(`[wordplay] Processing click on: ${clickedItem.textContent.trim()}`);

    // Get the actual link element inside the clicked word-item
    const innerLink = clickedItem.querySelector('.word');
    
    // Ensure the link exists and has an href before proceeding
    if (!innerLink || !innerLink.href) {
      console.warn('[wordplay] The clicked .word-item does not contain a valid link element (.word with href). Aborting.');
      return;
    }

    // Prevent default navigation to allow GSAP and Barba.js to handle the transition
    e.preventDefault(); 

    // Start the GSAP Flip animation immediately
    const animationTimeline = createWordSwapAnimation(clickedItem);

    // If Barba.js is available, initiate the page transition through its API
    // This will run in parallel with the GSAP animation.
    if (typeof Barba !== 'undefined' && Barba.go) {
      console.log('[wordplay] Initiating Barba.js page transition to:', innerLink.href);
     // Barba.go(innerLink.href); 
    } else {
      // Fallback if Barba.js is not found (though it should be if used)
      console.warn('[wordplay] Barba.js not detected or Barba.go method not found. Navigating directly.');
    //  window.location.href = innerLink.href;
    }
  });
});
