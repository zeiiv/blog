/**
 * file wordplay-animation.js
 * description Provides the Web Animations API logic for the header word-swapping effect.
 * This version is written in ES5-compatible JavaScript to work with older build tools like Uglifier.
 */

function animateWordSwap(options) {
    // Destructure options with a fallback for safety.
    var selectedItem = options.selectedItem;
    var pinnedItem = options.pinnedItem;
    var pileItems = options.pileItems;
    
    // Safety check to ensure all required elements were passed in.
    if (!selectedItem || !pinnedItem || !pileItems) {
        console.warn('[wordplay-animation] Animation aborted: Missing required elements.');
        return;
    }

    // Get the bounding boxes for coordinate calculations.
    var selectedBox = selectedItem.getBoundingClientRect();
    var pinnedBox = pinnedItem.getBoundingClientRect();
    var pileArray = Array.prototype.slice.call(pileItems).filter(function(el) {
        return el !== selectedItem;
    });

    // Determine the target location for the old pinned item.
    var targetPileItem = pileArray[0];
    // If there are no other items in the pile, the old pinned word will animate to where the selected word was.
    var targetBox = targetPileItem ? targetPileItem.getBoundingClientRect() : selectedBox;

    // Clone the elements that will be animated.
    var selectedClone = selectedItem.cloneNode(true);
    var pinnedClone = pinnedItem.cloneNode(true);

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

    styleClone(selectedClone, selectedBox, 1001);
    styleClone(pinnedClone, pinnedBox, 1000);

    // Add clones to the body and hide the originals.
    document.body.appendChild(selectedClone);
    document.body.appendChild(pinnedClone);
    selectedItem.style.opacity = '0';
    pinnedItem.style.opacity = '0';

    // --- Animation Logic using Web Animations API ---

    // 1. Shift the remaining pile words to close the gap.
    var shiftX = selectedBox.width + 8; // Assuming 8px gap.
    pileArray.forEach(function(el) {
        el.style.transition = 'transform 0.4s ease-in-out';
        el.style.transform = 'translateX(-' + shiftX + 'px)';
    });

    // 2. Define keyframes for the selected word's animation.
    var selectedFrames = [
        { transform: 'translateY(0px)' },
        { transform: 'translateY(20px)' },
        { transform: 'translate(' + (pinnedBox.left - selectedBox.left) + 'px, 20px)' },
        { transform: 'translate(' + (pinnedBox.left - selectedBox.left) + 'px, ' + (pinnedBox.top - selectedBox.top) + 'px)' }
    ];

    // 3. Define keyframes for the old pinned word's animation.
    var pinnedFrames = [
        { transform: 'translateY(0px)' },
        { transform: 'translateY(-20px)' },
        { transform: 'translate(' + (targetBox.left - pinnedBox.left) + 'px, -20px)' },
        { transform: 'translate(' + (targetBox.left - pinnedBox.left) + 'px, ' + (targetBox.top - pinnedBox.top) + 'px)' }
    ];

    var animationOptions = {
        duration: 2000,
        easing: 'ease-in-out',
        fill: 'forwards'
    };

    // 4. Run the animations.
    var selectedAnimation = selectedClone.animate(selectedFrames, animationOptions);
    pinnedClone.animate(pinnedFrames, animationOptions);

    // 5. Cleanup after the animation finishes.
    selectedAnimation.onfinish = function() {
        // Remove the clones.
        selectedClone.remove();
        pinnedClone.remove();

        // Restore the original items' visibility and reset pile positions.
        selectedItem.style.opacity = '1';
        pinnedItem.style.opacity = '1';
        pileArray.forEach(function(el) {
            el.style.transition = '';
            el.style.transform = '';
        });
    };
}
