/**
 * wordplay-animate.js
 * Handles 3-part header animation:
 * - selected-move (pile → pinned)
 * - pinned-move (pinned → pile)
 * - piled-move (shift to fill gap)
 */

function animateWordSwap({ selectedItem, pinnedItem, pileItems, pileZone, pinnedZone }) {
    if (!selectedItem || !pileZone || !pinnedZone) {
        console.warn('[wordplay-animate] Missing required elements.');
        return;
    }

    const selectedBox = selectedItem.getBoundingClientRect();
    const pinnedBox = pinnedItem?.getBoundingClientRect();
    const pileArray = Array.from(pileItems).filter(el => el !== selectedItem);

    // Determine pile target location (first word-item in pile)
    const targetPileItem = pileArray[0];
    const targetBox = targetPileItem?.getBoundingClientRect();

    // Clone selected + pinned
    const selectedClone = selectedItem.cloneNode(true);
    const pinnedClone = pinnedItem?.cloneNode(true);

    function styleClone(clone, box, z = 1000) {
        Object.assign(clone.style, {
            position: 'fixed',
            top: `${box.top}px`,
            left: `${box.left}px`,
            width: `${box.width}px`,
            height: `${box.height}px`,
            margin: 0,
            zIndex: z,
            pointerEvents: 'none',
            transition: 'transform 0.6s ease-in-out',
        });
        document.body.appendChild(clone);
    }

    styleClone(selectedClone, selectedBox, 1001);
    if (pinnedClone) styleClone(pinnedClone, pinnedBox, 1000);

    // Shift piled words left
    const shiftX = selectedBox.width + 8;
    pileArray.forEach((el, i) => {
        el.style.transition = 'transform 0.4s ease-in-out';
        el.style.transform = `translateX(-${shiftX}px)`;
    }};

// Animate selected-move: down → left → up
const selectedFrames = [
    { transform: 'translateY(0px)' },
    { transform: `translateY(20px)` },
    { transform: `translate(${pinnedBox.left - selectedBox.left}px, 20px)` },
    { transform: `translate(${pinnedBox.left - selectedBox.left}px, ${pinnedBox.top - selectedBox.top}px)` },
    selectedClone.animate(selectedFrames, {
        duration: 600,
        easing: 'ease-in-out',
        fill: 'forwards',
    }
  ];

// Animate pinned-move: delayed down → right → up
if (pinnedClone && targetBox) {
    const pinnedFrames = [
        { transform: 'translateY(0px)' },
        { transform: 'translateY(40px)' },
        { transform: `translate(${targetBox.left - pinnedBox.left}px, 40px)` },
        { transform: `translate(${targetBox.left - pinnedBox.left}px, ${targetBox.top - pinnedBox.top}px)` },
    ];

    setTimeout(() => {
        pinnedClone.animate(pinnedFrames, {
            duration: 600,
            easing: 'ease-in-out',
            fill: 'forwards',
        });
    }, 80);
}

// Cleanup after animation
setTimeout(() => {
    selectedClone.remove();
    if (pinnedClone) pinnedClone.remove();
    pileArray.forEach(el => {
        el.style.transform = '';
        el.style.transition = '';
    });
}, 700);
