/**
 * @file app.js
 * @description Master application script using the "Managed Transition" model.
 * This definitive solution uses Promises and Barba Views to create a stable,
 * flicker-free animation and page transition experience.
 */
document.addEventListener('DOMContentLoaded', function() {

  /**
   * The GSAP animation function.
   * This function now returns a Promise that resolves when the animation is complete.
   * @param {object} data - The data object provided by the Barba.js leave hook.
   * @returns {Promise<void>}
   */
  function runWordSwapAnimation(data) {
    return new Promise(function(resolve) {
      console.log('[app] Triggering GSAP word-swap animation.');
      var header = document.getElementById('wordplay-header');
      if (!header) {
        console.error("Animation aborted: Header not found.");
        return resolve(); // Immediately resolve if there's nothing to animate.
      }

      var clickedLink = data.trigger;
      var pinnedItem = header.querySelector('.zone-pinned .word-item');
      var clickedItem = clickedLink.closest('.zone-pile .word-item');
      
      if (!pinnedItem || !clickedItem) {
        console.error("Animation aborted: Pinned or clicked item not found.");
        return resolve(); // Immediately resolve if elements are missing.
      }

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
      
      // We hide the entire header to prevent flickering of the old state.
      // The `beforeEnter` hook will be responsible for making the new one visible.
      gsap.set(header, { opacity: 0 });

      gsap.timeline({
        onComplete: function() {
          // When the animation is done, remove the clones and resolve the promise.
          movingToActive.remove();
          movingToPile.remove();
          console.log('[app] GSAP animation complete. Resolving promise for Barba.');
          resolve(); // This signals to Barba that the leave animation is done.
        }
      })
      .to([movingToActive, movingToPile], { scale: 1.1, duration: 0.2 }, 0)
      .to(movingToPile, { y: 60, x: clickedRect.left - pinnedRect.left, scale: 0.9, duration: 0.7, ease: 'power2.inOut' }, 0.1)
      .to(movingToActive, { y: 120, x: pinnedRect.left - clickedRect.left, scale: 1.2, duration: 0.7, ease: 'power2.inOut' }, 0.1)
      .to([movingToActive, movingToPile], { y: 0, scale: 1, duration: 0.4, ease: 'power4.out' });
    });
  }

  // --- BARBA.JS INITIALIZATION ---
  barba.init({
    debug: true,
    transitions: [{
      // The default fade for all links that don't trigger the word-swap.
      name: 'default-fade',
      leave: function(data) {
        return gsap.to(data.current.container, { opacity: 0, duration: 0.25 });
      },
      enter: function(data) {
        return gsap.from(data.next.container, { opacity: 0, duration: 0.25 });
      }
    }, {
      // The custom transition for our word swap.
      name: 'word-swap',
      // The rule to trigger this special transition.
      custom: function(data) {
        var clickedItem = data.trigger.closest('.zone-pile .word-item');
        var pinnedItemExists = document.querySelector('.zone-pinned .word-item');
        return clickedItem && pinnedItemExists;
      },
      leave: function(data) {
        // This is the key: Barba will now wait for our animation promise to resolve.
        return runWordSwapAnimation(data);
      },
      enter: function(data) {
        // The main page content fades in. The header is handled by the view.
        return gsap.from(data.next.container, { opacity: 0, duration: 0.4 });
      }
    }],
    // This 'view' tells Barba how to handle the persistent header.
    views: [{
      namespace: 'wordplay-page',
      // This hook runs AFTER the leave animation is complete but BEFORE the enter.
      beforeEnter: function({ next }) {
        var headerElement = document.getElementById('wordplay-header');
        var nextHeaderHTML = next.html.match(/<header class="wordplay-header" id="wordplay-header">[\s\S]*?<\/header>/);
        if (nextHeaderHTML && headerElement) {
          // Replace the current header's HTML with the HTML from the next page.
          headerElement.innerHTML = nextHeaderHTML[0].replace(/<header.*?>|<\/header>/g, '');
          // Force the new header to be visible immediately.
          gsap.set(headerElement, { opacity: 1 });
          console.log('[barba] Header updated and visible for new page.');
        }
      }
    }]
  });
});
