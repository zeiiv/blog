document.addEventListener('DOMContentLoaded', () => {
    console.log('[app] DOMContentLoaded fired');

    // NOTE: Make sure #wordplay-header is placed OUTSIDE of data-barba="container" in HTML

    const wordplayHeader = document.getElementById('wordplay-header');

    if (!wordplayHeader) {
        console.error('[app] CRITICAL: No element with ID "wordplay-header" found. Aborting initialization.');
        return;
    }

    console.log('[app] Found #wordplay-header');

    const pileZone = wordplayHeader.querySelector('.zone-pile');
    // Initialize fullWordList ONCE from the original DOM structure
    window.fullWordList = pileZone ? Array.from(pileZone.children).map(node => node.cloneNode(true)) : [];

   function normalizePath(path) {
        try {
            const url = new URL(path, window.location.origin);
            return url.pathname.replace(/\//+$/, '') + '/';
        } catch (error) { // This is the corrected line for compatibility
            return '/';
        }
    } 

    wordplayHeader.addEventListener('click', (e) => {
        if (window.__animationInProgress) {
            console.warn('[app] Animation already in progress. Click ignored.');
            return;
        }

        const clickedItem = e.target.closest('.zone-pile .word-item');
        if (!clickedItem) {
            console.warn('[app] Clicked outside of .zone-pile .word-item');
            return;
        }

        const pinnedItem = wordplayHeader.querySelector('.zone-pinned .word-item');
        const pinnedZone = wordplayHeader.querySelector('.zone-pinned');
        const pileItems = pileZone?.querySelectorAll('.word-item') || [];

        // Check if pinnedItem is present before proceeding with animation
        if (!pinnedItem) {
            console.warn('[app] No .word-item found inside .zone-pinned. Cannot start animation.');
            return; // Abort if pinnedItem is missing
        }
        if (!pileZone) {
            console.error('[app] Missing .zone-pile');
            return;
        }
        if (!pinnedZone) {
            console.error('[app] Missing .zone-pinned');
            return;
        }

        const innerLink = clickedItem.querySelector('.word');

        if (!innerLink || !innerLink.href) {
            console.error('[app] Clicked .word-item missing .word or href');
            return;
        }

        const href = innerLink.href;
        console.log('[app] Word pile clicked:', href);

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        try {
            if (typeof animateWordSwapAnimation === 'function') {
                console.log('[app] Triggering animateWordSwapAnimation()');
                requestAnimationFrame(() => {
                    animateWordSwapAnimation({
                        selectedItem: clickedItem,
                        pinnedItem,
                        pileItems,
                        pileZone,
                        pinnedZone,
                        href
                    });
                });
            } else {
                console.warn('[app] animateWordSwapAnimation() not defined or not loaded');
            }
        } catch (err) {
            console.error('[app] ERROR during animateWordSwapAnimation():', err);
        }
    });

    if (typeof barba !== 'undefined') {
        console.log('[app] Initializing Barba.js');

        window.addEventListener('beforeunload', () => {
            document.querySelectorAll('.word-clone').forEach(el => el.remove());
        });

       barba.init({
            sync: true,
            transitions: [{
                name: 'fade',
                leave({ current }) {
                    console.log('[barba] Leaving current page');
                    return gsap.to(current.container, { opacity: 0, duration: 0.25, clearProps: 'opacity' });
                },
                enter({ next }) {
                    console.log('[barba] Entering new page');
                    // Ensure next container is immediately hidden (both opacity and visibility)
                    gsap.set(next.container, { opacity: 0, visibility: 'hidden' });
                    // Animate it in, and clear both properties at the end
                    return gsap.to(next.container, { opacity: 1, visibility: 'visible', duration: 0.25, clearProps: 'opacity,visibility' });
                }
            }]
        });

        barba.hooks.afterEnter(({ next }) => {
            console.log('[barba] afterEnter started for:', next.url.path);
            const header = document.getElementById('wordplay-header');
            const pileZone = header?.querySelector('.zone-pile');
            const pinnedZone = header?.querySelector('.zone-pinned');

            if (!pileZone || !pinnedZone) {
                console.error('[barba] Missing .zone-pile or .zone-pinned in afterEnter. Cannot update header content.');
                // Header should now be visible by default CSS, no need to force reveal
                return;
            }

            // Cleanup any clone artifacts from previous word swap animation
            document.querySelectorAll('.word-clone').forEach(clone => clone.remove());
            document.querySelectorAll('.word-item').forEach(item => {
                // Ensure all original word items are reset from any previous animation state
                gsap.set(item, { opacity: 1, x: 0, y: 0, rotationX: 0, scale: 1, clearProps: "all" });
            });
            window.__animationInProgress = false;

            const currentPath = normalizePath(window.location.pathname);
            console.log('[barba] Current path normalized:', currentPath);

            // Instant update of header content (no fade-out/in for words initially)
            pileZone.innerHTML = '';
            pinnedZone.innerHTML = '';
            let matchedItemForPinned = null;

            if (window.fullWordList.length > 0) {
                window.fullWordList.forEach(originalNode => {
                    const clone = originalNode.cloneNode(true);
                    const anchor = clone.querySelector('a');
                    if (!anchor) return;
                    const clonePath = normalizePath(new URL(anchor.href).pathname);
                    if (clonePath === currentPath) {
                        matchedItemForPinned = clone;
                    } else if (pileZone) {
                        pileZone.appendChild(clone);
                    }
                });
            } else {
                console.warn('[barba] window.fullWordList is empty. Cannot populate header zones.');
            }

            if (!matchedItemForPinned && window.fullWordList.length > 0) {
                matchedItemForPinned = window.fullWordList[0].cloneNode(true);
                const matchedAnchor = matchedItemForPinned.querySelector('a');
                if (matchedAnchor && pileZone) {
                    const existingPileItem = pileZone.querySelector(`a[href="${matchedAnchor.href}"]`)?.closest('.word-item');
                    if(existingPileItem) {
                        existingPileItem.remove();
                    }
                }
                console.log('[barba] Defaulting pinned word to:', matchedItemForPinned?.textContent?.trim());
            }

            if (matchedItemForPinned && pinnedZone) {
                matchedItemForPinned.classList.add('pinned-word');
                pinnedZone.appendChild(matchedItemForPinned);
            } else if (!matchedItemForPinned) {
                console.warn('[barba] No matching word found for current path, and fullWordList is empty. Pinned zone remains empty or could not be populated.');
            }
            console.log('[barba] Updated fullWordList, new pile count:', pileZone ? pileZone.children.length : 'N/A');

            // Header and its contents should be visible instantly by default. No overall header fade or word fade here.
        });

        barba.hooks.after(() => {
            console.log('[barba] Transition complete');
        });
    } else {
        console.warn('[app] Barba.js not detected on window');
    }
});

window.animateWordSwapAnimation = function ({ selectedItem, pinnedItem, pileItems, pileZone, pinnedZone, href }) {
    if (!selectedItem || !pinnedItem || !pileItems) {
        console.warn('[wordplay-animation] Missing required elements for animation. Selected:', !!selectedItem, 'Pinned:', !!pinnedItem, 'Pile:', !!pileItems);
        return;
    }

    window.__animationInProgress = true;

    requestAnimationFrame(() => {
        const selectedBox = selectedItem.getBoundingClientRect();
        const pinnedBox = pinnedItem.getBoundingClientRect();

        console.log('[wordplay-animation] selectedBox:', selectedBox);
        console.log('[wordplay-animation] pinnedBox:', pinnedBox);

        const selectedClone = selectedItem.cloneNode(true);
        const pinnedClone = pinnedItem.cloneNode(true);

        console.log('[wordplay-animation] Created selectedClone and pinnedClone');

        selectedClone.classList.add('word-clone');
        pinnedClone.classList.add('word-clone');

        function styleClone(clone, box, z = 1000) {
            Object.assign(clone.style, {
                position: 'fixed',
                top: `${box.top}px`,
                left: `${box.left}px`,
                width: `${box.width}px`,
                height: `${box.height}px`,
                margin: '0',
                zIndex: `${z}`,
                pointerEvents: 'none'
            });
        }

        styleClone(selectedClone, selectedBox, 1001);
        styleClone(pinnedClone, pinnedBox, 1000);
        document.body.appendChild(selectedClone);
        document.body.appendChild(pinnedClone);

        selectedItem.style.opacity = '0';
        pinnedItem.style.opacity = '0';

        const shiftX = selectedBox.width + 8;
        const pileArray = Array.from(pileItems).filter(el => el !== selectedItem);

        pileArray.forEach(el => {
            el.style.transition = 'transform 0.4s ease-in-out';
            el.style.transform = `translateX(-${shiftX}px)`;
        });

        const selectedFrames = [
            { transform: 'translateY(0px)' },
            { transform: 'translateY(20px)' },
            {
                transform: `translate(${pinnedBox.left - selectedBox.left}px, 20px)`
            },
            {
                transform: `translate(${pinnedBox.left - selectedBox.left}px, ${pinnedBox.top - selectedBox.top}px)`
            }
        ];

        const pinnedFrames = [
            { transform: 'translateY(0px)' },
            { transform: 'translateY(-20px)' },
            {
                transform: `translate(${selectedBox.left - pinnedBox.left}px, -20px)`
            },
            {
                transform: `translate(${selectedBox.left - pinnedBox.left}px, ${selectedBox.top - pinnedBox.top}px)`
            }
        ];

        const options = {
            duration: 2000,
            easing: 'ease-in-out',
            fill: 'forwards'
        };

        // Note: The previous version used selectedClone.animate.
        // We will now use GSAP timeline consistently for all animations
        const tl = gsap.timeline({
            onComplete: () => {
                // Cleanup clones and restore originals
                selectedClone.remove();
                pinnedClone.remove();
                selectedItem.style.opacity = '1';
                pinnedItem.style.opacity = '1';

                // Reset pile items
                pileArray.forEach(el => {
                    gsap.set(el, { clearProps: "transform,transition" });
                });

                window.__animationInProgress = false;

                // Trigger Barba.js navigation
                safeNavigate();
            }
        });

        // Animate the pile items (move them out of the way)
        const initialShiftX = selectedBox.width + 8; // Assuming 8px gap between words
        tl.to(pileArray, {
            x: `-=${initialShiftX}`, // Move left by its width + gap
            duration: 0.5,
            ease: "power2.out",
            stagger: 0.05
        }, 0);

        // Animate the selected word clone to the pinned position with a creative effect
        tl.to(selectedClone, {
            x: pinnedBox.left - selectedBox.left,
            y: pinnedBox.top - selectedBox.top,
            rotationX: 360, // Flip effect
            scale: 1.1, // Slightly pop out
            duration: 1,
            ease: "power3.inOut"
        }, 0);

        // Animate the pinned word clone to the target pile position with a creative effect
        tl.to(pinnedClone, {
            x: selectedBox.left - pinnedBox.left, // Moves to where selected item was
            y: selectedBox.top - pinnedBox.top,
            rotationX: -360, // Flip effect in opposite direction
            scale: 0.9, // Shrink slightly
            opacity: 0, // Fade out as it moves to the pile
            duration: 1,
            ease: "power3.inOut"
        }, 0);

    });
};