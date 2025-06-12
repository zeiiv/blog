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
    window.fullWordList = pileZone ? Array.from(pileZone.children).map(node => node.cloneNode(true)) : [];
    function normalizePath(path) {
        try {
            const url = new URL(path, window.location.origin);
            return url.pathname.replace(/\/+$/, '') + '/';
        } catch {
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

        if (!pinnedItem) console.warn('[app] No .word-item found inside .zone-pinned');
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
                    gsap.set(next.container, { opacity: 0 });
                    return gsap.to(next.container, { opacity: 1, duration: 0.25, clearProps: 'opacity' });
                }
            }]
        });

        barba.hooks.afterEnter(({ next }) => {
            console.log('[barba] afterEnter:', next.url.path);
            const header = document.getElementById('wordplay-header');
            const pileZone = header?.querySelector('.zone-pile');
            const pinnedZone = header?.querySelector('.zone-pinned');

            if (!pileZone || !pinnedZone) {
                console.error('[barba] Missing .zone-pile or .zone-pinned in afterEnter');
                return;
            }

            // Cleanup any clone artifacts or leftover animation states
            document.querySelectorAll('.word-clone').forEach(clone => clone.remove());
            document.querySelectorAll('.word-item').forEach(item => {
                item.style.opacity = '1';
                item.style.transform = '';
                item.style.transition = '';
            });
            window.__animationInProgress = false;

            const currentPath = normalizePath(window.location.pathname);
            console.log('[barba] Current path normalized:', currentPath);

            // Build fresh list from current pile DOM 
            const localFullList = Array.from(pileZone.children).map(n => n.cloneNode(true));

            pileZone.innerHTML = '';
            let matchedItem = null;

            localFullList.forEach(clone => {
                const anchor = clone.querySelector('a');
                if (!anchor) return;

                const clonePath = normalizePath(new URL(anchor.href).pathname);
                console.log('[barba] Checking clonePath:', clonePath);
                if (clonePath === currentPath) {
                    console.log('[barba] Matched pinned word:', clonePath);
                    matchedItem = clone.cloneNode(true);
                } else {
                    pileZone.appendChild(clone.cloneNode(true));
                }
            });

            // Update global fullWordList to match current pile DOM 
            window.fullWordList = Array.from(pileZone.children).map(n => n.cloneNode(true));

            if (!matchedItem) {
                console.warn('[barba] No matching pile word for current page:', currentPath);
                return;
            }

            console.log('[barba] Moving word to pinned zone:', matchedItem);

            try {
                pinnedZone.innerHTML = '';
                matchedItem.classList.add('pinned-word');
                pinnedZone.appendChild(matchedItem);
                console.log('[barba] Updated fullWordList, new pile:', pileZone.children.length);
            } catch (err) {
                console.error('[barba] Error moving matching word to pinned zone:', err);
            }
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
        console.warn('[wordplay-animation] Missing required elements for animation.');
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

        const selectedAnimation = selectedClone.animate(selectedFrames, options);
        pinnedClone.animate(pinnedFrames, options);

        let navigationTriggered = false;
        function safeNavigate() {
            if (navigationTriggered) return;
            navigationTriggered = true;
            try {
                if (typeof barba !== 'undefined' && typeof barba.go === 'function') {
                    console.log('[app] Navigating via Barba to:', href);
                    barba.go(href);
                } else {
                    console.log('[app] Barba not available — fallback to location.href');
                    window.location.href = href;
                }
            } catch (err) {
                console.error('[app] Navigation error:', err);
            }
        }

        setTimeout(() => {
            if (!navigationTriggered) {
                console.warn('[wordplay-animation] Fallback triggered navigation');
                safeNavigate();
            }
        }, 1200);

        selectedAnimation.onfinish = () => {
            if (document.body.contains(selectedClone)) {
                selectedClone.remove();
                pinnedClone.remove();
                selectedItem.style.opacity = '1';
                pinnedItem.style.opacity = '1';
                pileArray.forEach(el => {
                    el.style.transition = '';
                    el.style.transform = '';
                });
                console.log('[wordplay-animation] Animation complete');
            } else {
                console.log('[wordplay-animation] Animation was interrupted by navigation');
            }

            window.__animationInProgress = false;
            safeNavigate();
        };
    });
};
