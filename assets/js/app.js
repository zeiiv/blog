/**
 * file app.js
 * description Master application script for all Barba.js transitions and GSAP animations.
 * This single file orchestrates the entire page transition and word-swap effect with robust checks.
 */

document.addEventListener('DOMContentLoaded', function() {

  // --- State Lock ---
  // Prevents new animations from starting while one is already in progress.
  let isAnimating = false;

  /**
   * Creates the choreographed word-swapping animation using GSAP.
   * @param {object} data - The data object provided by the Barba.js leave hook.
   * @returns {gsap.core.Timeline | null} A GSAP timeline for Barba to await.
   */
  function createWordSwapAnimation(data) {
    console.log('[app] Triggering GSAP word-swap animation.');
    var header = document.getElementById('wordplay-header');
    
    // Safety check to ensure the header exists.
    if (!header) {
      console.error("[wordplay] Animation aborted: #wordplay-header element not found.");
      return null;
    }

    // 1. Get all the elements we need.
    var clickedLink = data.trigger;
    var pinnedItem = header.querySelector('.zone-pinned .word-item');
    var clickedItem = clickedLink.closest('.word-item');
    
    // This is the most critical safety check.
    if (!pinnedItem || !clickedItem) {
      console.error("[wordplay] Animation aborted: Pinned or clicked item not found in their zones.");
      return null;
    }
    
    var pileItems = Array.from(header.querySelectorAll('.zone-pile .word-item'));
    var otherPileItems = pileItems.filter(function(item) { return item !== clickedItem; });

    // 2. Calculate coordinates and create clones.
    var clickedRect = clickedItem.getBoundingClientRect();
    var pinnedRect = pinnedItem.getBoundingClientRect();
    var movingToActive = clickedItem.cloneNode(true);
    var movingToPile = pinnedItem.cloneNode(true);
    
    movingToActive.classList.add('word-clone');
    movingToPile.classList.add('word-clone');
    document.body.appendChild(movingToActive);
    document.body.appendChild(movingToPile);
    
    gsap.set(movingToActive, { top: clickedRect.top, left: clickedRect.left, width: clickedRect.width, height: clickedRect.height });
    gsap.set(movingToPile, { top: pinnedRect.top, left: pinnedRect.left, width: pinnedRect.width, height: pinnedRect.height });
    gsap.set([clickedItem, pinnedItem], { opacity: 0 });

    // 3. Create the Master GSAP Timeline.
    var masterTimeline = gsap.timeline({
      onStart: function() {
        isAnimating = true;
        console.log('[app] Animation lock ENGAGED.');
      },
      onComplete: function() {
        movingToActive.remove();
        movingToPile.remove();
        isAnimating = false;
        console.log('[app] Animation complete. Lock RELEASED.');
      }
    });

    // --- Animation Choreography ---
    var travelDuration = 0.7;
    var easeType = 'circ.inOut';
    
    // Phase 1: Lift-Off
    masterTimeline.to(otherPileItems, { opacity: 0.3, duration: 0.15 }, 0);
    masterTimeline.to([movingToActive, movingToPile], { scale: 1.15, duration: 0.15 }, 0);
    
    // Phase 2: The Safe Travel
    masterTimeline.to(movingToPile, { y: 60, x: clickedRect.left - pinnedRect.left, scale: 0.85, duration: travelDuration, ease: easeType }, ">-0.05");
    masterTimeline.to(movingToActive, { y: 120, x: pinnedRect.left - clickedRect.left, scale: 1.25, duration: travelDuration, ease: easeType }, "<");
    
    // Phase 2.5: Rearrange the pile
    var clickedIndexInPile = pileItems.findIndex(function(item) { return item === clickedItem; });
    var itemsToShiftLeft = pileItems.slice(clickedIndexInPile + 1);
    var gapWidth = clickedRect.width + (parseFloat(getComputedStyle(clickedItem).marginLeft) || 0);

    if (itemsToShiftLeft.length > 0) {
      masterTimeline.to(itemsToShiftLeft, {
        x: "-=" + gapWidth,
        duration: travelDuration * 0.8,
        ease: 'power3.inOut'
      }, "<+0.2");
    }
    
    // Phase 3: The Landing
    masterTimeline.to([movingToActive, movingToPile], { y: 0, scale: 1, duration: 0.4, ease: 'power4.out' });
    masterTimeline.to(otherPileItems, { opacity: 1, duration: 0.4 }, "<");

    return masterTimeline;
  }

  // --- Barba.js Initialization ---
  barba.init({
    debug: true,
    transitions: [{
      name: 'default-fade',
      leave: function(data) { return gsap.to(data.current.container, { opacity: 0, duration: 0.25 }); },
      enter: function(data) { return gsap.from(data.next.container, { opacity: 0, duration: 0.25 }); }
    }, {
      name: 'word-swap',
      // This is the corrected, more robust rule to trigger the transition.
      custom: function(data) {
        if (isAnimating) {
          console.log('[barba] Rule check: REJECTED (isAnimating is true)');
          return false;
        }

        // The rule is ONLY true if the clicked link is inside the .zone-pile
        // AND a .pinned-word exists on the page to be swapped.
        var isInPile = data.trigger.closest('.zone-pile');
        var pinnedItemExists = document.querySelector('.zone-pinned .word-item');
        
        var isValidSwap = isInPile && pinnedItemExists;
        
        console.log('[barba] Rule check: Is this a valid word-swap click? ->', !!isValidSwap);
        return isValidSwap;
      },
      leave: function(data) {
        return createWordSwapAnimation(data);
      },
      enter: function(data) {
        return gsap.from(data.next.container, { opacity: 0, duration: 0.5, delay: 0.4 });
      }
    }]
  });
});