/**
 * Unified app.js — Persistent Header Animation & Barba.js Integration
 * This version assumes the header is outside of Barba's container and never reloaded.
 * Word transitions are handled in-place and only DOM content is swapped.
 */
<script src="{{ '/assets/js/wordplay-animation.js' | relative_url }}"></script>

document.addEventListener('DOMContentLoaded', () => {
    const wordplayHeader = document.getElementById('wordplay-header');

    if (!wordplayHeader) {
        console.warn('[app] No wordplay header found.');
        return;
    }

    // Setup click handling for word transitions
    wordplayHeader.addEventListener('click', (e) => {
        const clickedItem = e.target.closest('.zone-pile .word-item');
        if (!clickedItem) return;

        const pinnedItem = wordplayHeader.querySelector('.zone-pinned .word-item');
        const pileZone = wordplayHeader.querySelector('.zone-pile');
        const pinnedZone = wordplayHeader.querySelector('.zone-pinned');
        const pileItems = pileZone.querySelectorAll('.word-item');
        const innerLink = clickedItem.querySelector('.word');

        if (!innerLink || !innerLink.href) return;

        e.preventDefault();

        // Run animation
        if (typeof animateWordSwap === 'function') {
            animateWordSwap({
                selectedItem: clickedItem,
                pinnedItem,
                pileItems,
                pileZone,
                pinnedZone
            });
        }

        // Trigger navigation after a short delay
        setTimeout(() => {
            if (typeof barba !== 'undefined' && typeof barba.go === 'function') {
                console.log('[app] Navigating via Barba to:', innerLink.href);
                barba.go(innerLink.href);
            } else {
                window.location.href = innerLink.href;
            }
        }, 50);
    });

    // Initialize Barba.js
    if (typeof barba !== 'undefined') {
        barba.init({
            sync: true,
            transitions: [{
                name: 'fade',
                leave({ current }) {
                    return gsap.to(current.container, { opacity: 0, duration: 0.3 });
                },
                enter({ next }) {
                    gsap.set(next.container, { opacity: 0 });
                    return gsap.to(next.container, { opacity: 1, duration: 0.3 });
                }
            }]
        });

        // Re-apply any header JS logic after enter (if needed)
        barba.hooks.afterEnter(({ next }) => {
            console.log('[app] Page entered:', next.url.path);
            barba.hooks.afterEnter(({ next }) => {
                const header = document.getElementById('wordplay-header');
                const pileZone = header?.querySelector('.zone-pile');
                const pinnedZone = header?.querySelector('.zone-pinned');

                if (!pileZone || !pinnedZone) return;

                // Get current path (e.g. "/of/")
                const currentPath = new URL(window.location.href).pathname;

                // Find the matching word in the pile
                const matchingItem = pileZone.querySelector(`.word-item a[href='${currentPath}']`)?.closest('.word-item');

                if (!matchingItem) {
                    console.warn('[wordplay] No matching pile word for current page:', currentPath);
                    return;
                }

                // Move matching word to pinned zone
                pinnedZone.innerHTML = '';
                pileZone.removeChild(matchingItem);
                matchingItem.classList.add('pinned-word');
                pinnedZone.appendChild(matchingItem);
            });
        });

        barba.hooks.after(() => {
            requestAnimationFrame(() => {
                console.log('[app] Barba transition fully complete.');
            });
        });
    }
});
