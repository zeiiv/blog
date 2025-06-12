/**
 * @file app.js
 * @description Master application script for Barba.js transitions and GSAP animations.
 * This final version uses the Barba.js "Views" feature and decouples the
 * animation from the page load to create a fluid and stable transition.
 */
document.addEventListener('DOMContentLoaded', function() {

  // --- State Lock ---
  let isAnimating = false;

  /**
   * Creates and runs the choreographed word-swapping animation using GSAP.
   * This function now runs independently and does NOT return a timeline.
   * @param {object} data - The data object provided by the Barba.js leave hook.
   */
  function runWordSwapAnimation(data) {
    var header = document.getElementById('wordplay-header');
    var clickedLink = data.trigger;
    var pinnedItem = header.querySelector('.zone-pinned .word-item');
    var clickedItem = clickedLink.closest('.zone-pile .word-item');
    
    if (!pinnedItem || !clickedItem) {
      console.error("[wordplay] Animation aborted: Pinned or clicked item not found.");
      return;
    }

    // --- SETUP ---
    var pileItems = Array.from(header.querySelectorAll('.zone-pile .word-item'));
    var otherPileItems = pileItems.filter(function(item) { return item !== clickedItem; });
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

    // --- GSAP TIMELINE ---
    var masterTimeline = gsap.timeline({
      onStart: function() { isAnimating = true; },
      onComplete: function() {
        // The ONLY job of onComplete is to remove the clones.
        movingToActive.remove();
        movingToPile.remove();
        isAnimating = false;
        console.log('[app] Visual animation finished. Clones removed.');
      }
    });

    // --- Animation Choreography ---
    var travelDuration = 0.7;
    var easeType = 'circ.inOut';
    masterTimeline.to(otherPileItems, { opacity: 0.3, duration: 0.15 }, 0);
    masterTimeline.to([movingToActive, movingToPile], { scale: 1.15, duration: 0.15 }, 0);
    masterTimeline.to(movingToPile, { y: 60, x: clickedRect.left - pinnedRect.left, scale: 0.85, duration: travelDuration, ease: easeType }, ">-0.05");
    masterTimeline.to(movingToActive, { y: 120, x: pinnedRect.left - clickedRect.left, scale: 1.25, duration: travelDuration, ease: easeType }, "<");
    masterTimeline.to([movingToActive, movingToPile], { y: 0, scale: 1, duration: 0.4, ease: 'power4.out' });
    masterTimeline.to(otherPileItems, { opacity: 1, duration: 0.4 }, "<");
  }

  // --- Barba.js Initialization ---
  barba.init({
    debug: true,
    sync: true, // Allows leave and enter to overlap, crucial for smoothness
    transitions: [{
      name: 'default-fade',
      leave: function(data) { return gsap.to(data.current.container, { opacity: 0, duration: 0.25 }); },
      enter: function(data) { return gsap.from(data.next.container, { opacity: 0, duration: 0.25 }); }
    }, {
      name: 'word-swap',
      custom: function(data) {
        if (isAnimating) return false;
        var clickedItem = data.trigger.closest('.zone-pile .word-item');
        var pinnedItemExists = document.querySelector('.zone-pinned .word-item');
        return clickedItem && pinnedItemExists;
      },
      leave: function(data) {
        // Start the visual animation.
        runWordSwapAnimation(data);
        // Immediately return a short promise. This tells Barba to start
        // fetching the next page RIGHT AWAY.
        return new Promise(function(resolve) {
          setTimeout(resolve, 200); // 200ms delay before content swap
        });
      },
      enter: function(data) {
        // The new content will fade in after the short delay.
        return gsap.from(data.next.container, { opacity: 0, duration: 0.4 });
      }
    }],
    views: [{
      namespace: 'wordplay-page',
      beforeEnter: function({ next }) {
        console.log('[barba] Updating persistent header.');
        var nextHeaderHTML = next.html.match(/<header class="wordplay-header" id="wordplay-header">[\s\S]*?<\/header>/);
        var headerElement = document.getElementById('wordplay-header');
        if (nextHeaderHTML && headerElement) {
          // Replace the old header's content with the new header's content.
          headerElement.innerHTML = nextHeaderHTML[0].replace(/<header.*?>|<\/header>/g, '');
          
          // ** THIS IS THE FIX FOR THE RACE CONDITION **
          // We use a delayed call to ensure the DOM has updated before we try to
          // change the opacity. A delay of 0 is enough to push this command
          // to the next "tick" of the browser's event loop.
          gsap.delayedCall(0, function() {
            gsap.set(headerElement.querySelectorAll('.word-item'), { opacity: 1 });
            console.log('[barba] Header updated and all items set to visible.');
          });
        }
      }
    }]
  });
});
