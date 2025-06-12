/**
 * file app.js
 * description Master application script for Barba.js transitions and animations.
 */

// This is the only file you need for your transition logic.
// You can delete wordplay.js and wordplay-animation.js.

document.addEventListener('DOMContentLoaded', function() {

  // --- Animation Function (now much simpler) ---
  function triggerWordSwapAnimation(data) {
    console.log('[app] Triggering CSS word-swap animation.');

    // 1. Get all the elements we need.
    var clickedLink = data.trigger;
    var header = document.getElementById('wordplay-header');
    var pinnedItem = header.querySelector('.pinned-word');
    var clickedItem = clickedLink.closest('.word-item');
    var pileItems = Array.from(header.querySelectorAll('.word-item:not(.pinned-word):not(.static-word)'));

    if (!pinnedItem || !clickedItem) return;

    // 2. Calculate coordinates.
    var clickedRect = clickedItem.getBoundingClientRect();
    var pinnedRect = pinnedItem.getBoundingClientRect();
    var travelToPinnedX = pinnedRect.left - clickedRect.left;
    var travelToPileX = clickedRect.left - pinnedRect.left;

    // 3. Create and position the clones.
    var movingToActive = clickedItem.cloneNode(true);
    var movingToPile = pinnedItem.cloneNode(true);
    
    movingToActive.classList.add('word-clone');
    movingToPile.classList.add('word-clone');
    
    gsap.set(movingToActive, { top: clickedRect.top, left: clickedRect.left, width: clickedRect.width, height: clickedRect.height });
    gsap.set(movingToPile, { top: pinnedRect.top, left: pinnedRect.left, width: pinnedRect.width, height: pinnedRect.height });

    // 4. Set the travel distance as a CSS variable on the clones.
    movingToActive.style.setProperty('--travel-path-x', `translateX(${travelToPinnedX}px)`);
    movingToPile.style.setProperty('--travel-path-x', `translateX(${travelToPileX}px)`);

    // 5. Hide the originals and add clones to the page.
    gsap.set([clickedItem, pinnedItem], { opacity: 0 });
    document.body.appendChild(movingToActive);
    document.body.appendChild(movingToPile);
    
    // 6. Rearrange the pile.
    var clickedIndex = pileItems.findIndex(item => item === clickedItem);
    var itemsToShift = pileItems.slice(clickedIndex + 1);
    var gapWidth = clickedRect.width + (parseFloat(getComputedStyle(clickedItem).marginLeft) || 0);
    gsap.to(itemsToShift, { x: `-=${gapWidth}`, duration: 0.6, ease: 'cubic-bezier(0.65, 0, 0.35, 1)' });

    // 7. Add the animation classes to start the CSS keyframe animations.
    movingToActive.classList.add('is-becoming-pinned');
    movingToPile.classList.add('is-returning-to-pile');
    
    // 8. Clean up the clones after the animation duration.
    setTimeout(() => {
        movingToActive.remove();
        movingToPile.remove();
    }, 800); // Must match the animation duration in the CSS.
  }

  // --- Barba.js Initialization ---
  barba.init({
    debug: true,
    transitions: [{
      // A default fade for all non-wordplay links.
      name: 'default-fade',
      leave({current}) {
        return gsap.to(current.container, { opacity: 0, duration: 0.25 });
      },
      enter({next}) {
        return gsap.from(next.container, { opacity: 0, duration: 0.25 });
      }
    }, {
      // The custom transition for our word swap.
      name: 'word-swap',
      custom: ({ trigger }) => trigger.closest('.wordpile'),
      
      leave(data) {
        // Run the animation trigger function.
        triggerWordSwapAnimation(data);
        // Tell Barba to wait for the animation to finish before proceeding.
        return new Promise(resolve => setTimeout(resolve, 800));
      },
      enter({next}) {
        // Fade in the new page content.
        gsap.from(next.container, { opacity: 0, duration: 0.4, delay: 0.2 });
      }
    }]
  });

});
