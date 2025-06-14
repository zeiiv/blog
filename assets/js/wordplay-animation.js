/**
 * file wordplay-animation.js
 * description Provides the Web Animations API logic for the header word-swapping effect.
 * This version is written in ES5-compatible JavaScript to work with older build tools like Uglifier.
 */

// Global flag to indicate if an animation is in progress
// This is managed by app.js before calling this function.
window.__animationInProgress = false; 

function animateWordSwapAnimation(options) {
    // Destructure options with a fallback for safety.
    var selectedItem = options.selectedItem;
    var pinnedItem = options.pinnedItem;
    var pileItems = options.pileItems; // This should be a live NodeList or HTMLCollection
    
    // Safety check to ensure all required elements were passed in.
    if (!selectedItem || !pinnedItem || !pileItems) {
        console.warn('[wordplay-animation] Animation aborted: Missing required elements.');
        // Resolve immediately if elements are missing, so Barba.js doesn't hang.
        return Promise.resolve();
    }

    // Return a Promise that resolves when the animation is complete.
    return new Promise(function(resolve) { // [FIX: Return a Promise]
        // Set flag to indicate animation is in progress
        window.__animationInProgress = true;

        requestAnimationFrame(function() {
            var selectedBox = selectedItem.getBoundingClientRect();
            var pinnedBox = pinnedItem.getBoundingClientRect();

            console.log('[wordplay-animation] selectedBox:', selectedBox);
            console.log('[wordplay-animation] pinnedBox:', pinnedBox);

            // Clone the elements that will be animated.
            var selectedClone = selectedItem.cloneNode(true);
            var pinnedClone = pinnedItem.cloneNode(true);

            console.log('[wordplay-animation] Created selectedClone and pinnedClone');

            selectedClone.classList.add('word-clone');
            pinnedClone.classList.add('word-clone');

            // Helper function to style the clones.
            function styleClone(clone, box, z) {
                z = z || 1000; // Default z-index.
                Object.assign(clone.style, {
                    position: 'fixed',
                    top: box.top + 'px',
                    left: box.left + 'px',
                    width: box.width + 'px',
                    height: box.height + 'px',
                    margin: '0',
                    zIndex: z.toString(),
                    pointerEvents: 'none' // Prevent clones from interfering with mouse events.
                });
            }

            styleClone(selectedClone, selectedBox, 1001); // selectedClone on top
            styleClone(pinnedClone, pinnedBox, 1000); // pinnedClone below

            // Add clones to the body and hide the originals.
            document.body.appendChild(selectedClone);
            document.body.appendChild(pinnedClone);
            selectedItem.style.opacity = '0';
            pinnedItem.style.opacity = '0';

            // Convert NodeList to Array for easier manipulation and filtering.
            var pileArray = Array.prototype.slice.call(pileItems).filter(function(el) {
                return el !== selectedItem;
            });

            // Determine the target location for the old pinned item.
            // If there are other items in the pile, the old pinned word will animate to where the first pile item is.
            // Otherwise, it will animate to where the selected word *was* (which is now empty).
            var targetPileItem = pileArray[0];
            var targetBox = targetPileItem ? targetPileItem.getBoundingClientRect() : selectedBox;

            // --- Animation Logic using Web Animations API ---

            // 1. Shift the remaining pile words to close the gap.
            var shiftX = selectedBox.width + 8; // Assuming 8px gap based on your CSS.
            pileArray.forEach(function(el) {
                // Apply transition property for the shift effect.
                el.style.transition = 'transform 0.4s ease-in-out';
                el.style.transform = 'translateX(-' + shiftX + 'px)';
            });

            // 2. Define keyframes for the selected word's animation (moves to pinned spot).
            var selectedFrames = [
                { transform: 'translateY(0px)' }, // Start at its current Y position
                { transform: 'translateY(20px)' }, // Dip down slightly (visual flair)
                { transform: 'translate(' + (pinnedBox.left - selectedBox.left) + 'px, 20px)' }, // Move horizontally, still dipped
                { transform: 'translate(' + (pinnedBox.left - selectedBox.left) + 'px, ' + (pinnedBox.top - selectedBox.top) + 'px)' } // Move to final pinned position
            ];

            // 3. Define keyframes for the old pinned word's animation (moves to pile spot).
            var pinnedFrames = [
                { transform: 'translateY(0px)' }, // Start at its current Y position
                { transform: 'translateY(-20px)' }, // Arc up slightly
                { transform: 'translate(' + (targetBox.left - pinnedBox.left) + 'px, -20px)' }, // Move horizontally, still arced
                { transform: 'translate(' + (targetBox.left - pinnedBox.left) + 'px, ' + (targetBox.top - pinnedBox.top) + 'px)' } // Move to final pile position
            ];

            var animationOptions = {
                duration: 1000, // [Adjusted: Shorter duration for snappier feel, was 2000]
                easing: 'ease-in-out',
                fill: 'forwards' // Keep the final state after animation
            };

            // 4. Run the animations.
            var selectedAnimation = selectedClone.animate(selectedFrames, animationOptions);
            var pinnedAnimation = pinnedClone.animate(pinnedFrames, animationOptions);

            // 5. Cleanup after the animation finishes.
            // Wait for the longer of the two animations to complete.
            selectedAnimation.onfinish = function() {
                // Ensure clones are still in the DOM before attempting to remove them.
                // This check is a safeguard if Barba.js somehow navigated too early.
                if (document.body.contains(selectedClone)) {
                    selectedClone.remove();
                    pinnedClone.remove();
                }

                // Restore the original items' visibility and reset pile positions.
                selectedItem.style.opacity = '1'; // Show original selected word
                pinnedItem.style.opacity = '1'; // Show original pinned word

                // Reset transforms and transitions for pile items
                pileArray.forEach(function(el) {
                    el.style.transition = ''; // Remove transition property
                    el.style.transform = ''; // Reset transform
                });

                console.log('[wordplay-animation] Animation complete. Resolving promise.');
                window.__animationInProgress = false; // Reset flag after animation.
                resolve(); // Resolve the Promise when the animation is truly finished.
            };

            // Fallback: If for any reason the 'onfinish' event doesn't fire (e.g., extremely rapid navigation
            // or an unexpected browser/JS engine issue), this ensures the promise eventually resolves
            // and clears the animation flag. This is a robust safeguard.
            setTimeout(function() {
                if (window.__animationInProgress) {
                    console.warn('[wordplay-animation] Fallback cleanup triggered: Animation might have been interrupted or failed to finish naturally.');
                    if (document.body.contains(selectedClone)) {
                        selectedClone.remove();
                        pinnedClone.remove();
                    }
                    selectedItem.style.opacity = '1';
                    pinnedItem.style.opacity = '1';
                    pileArray.forEach(function(el) {
                        el.style.transition = '';
                        el.style.transform = '';
                    });
                    window.__animationInProgress = false;
                    resolve(); // Ensure promise resolves even if fallback is hit.
                }
            }, animationOptions.duration + 200); // Give it a small buffer after expected duration.
        });
    });
}