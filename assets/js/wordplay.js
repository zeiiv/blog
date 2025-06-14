// import "./barba-config";



function animateWordSwapAnimation({ selectedItem, pinnedItem, pileItems, pileZone, pinnedZone }, onComplete) {
    console.log('[wordplay-animation] Starting chained FLIP animation');

    const animationLayer = document.createElement('div');
    animationLayer.id = 'animation-layer';
    Object.assign(animationLayer.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '9999',
    });
    document.body.appendChild(animationLayer);

    const selectedBox = selectedItem.getBoundingClientRect();
    const pinnedBox = pinnedItem?.getBoundingClientRect();

    const selectedClone = selectedItem.cloneNode(true);
    const pinnedClone = pinnedItem ? pinnedItem.cloneNode(true) : null;

    if (!selectedBox || (pinnedItem && !pinnedBox) || !selectedClone) {
        console.warn('[wordplay-animation] Missing bounding boxes or clones');
        animationLayer.remove();
        if (typeof onComplete === 'function') onComplete();
        return;
    }

    // Setup clones styling
    Object.assign(selectedClone.style, {
        position: 'absolute',
        left: `${selectedBox.left}px`,
        top: `${selectedBox.top}px`,
        width: `${selectedBox.width}px`,
        height: `${selectedBox.height}px`,
        margin: '0',
        zIndex: '1000',
        pointerEvents: 'none',
        transition: 'transform 300ms cubic-bezier(0.55, 0.055, 0.675, 0.19)', // easeIn for down
    });
    animationLayer.appendChild(selectedClone);

    if (pinnedClone) {
        Object.assign(pinnedClone.style, {
            position: 'absolute',
            left: `${pinnedBox.left}px`,
            top: `${pinnedBox.top}px`,
            width: `${pinnedBox.width}px`,
            height: `${pinnedBox.height}px`,
            margin: '0',
            zIndex: '999',
            pointerEvents: 'none',
            transition: 'transform 300ms cubic-bezier(0.215, 0.61, 0.355, 1)', // easeOut for down
        });
        animationLayer.appendChild(pinnedClone);
    }

    // Pile clones setup
    const pileArray = Array.from(pileItems).filter(el => el !== selectedItem);
    const pileBoxes = pileArray.map(el => el.getBoundingClientRect());

    const pileClones = pileArray.map((el, i) => {
        const box = pileBoxes[i];
        const clone = el.cloneNode(true);
        Object.assign(clone.style, {
            position: 'absolute',
            left: `${box.left}px`,
            top: `${box.top}px`,
            width: `${box.width}px`,
            height: `${box.height}px`,
            margin: '0',
            zIndex: '998',
            pointerEvents: 'none',
            transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)', // easeInOut for pile move
            transform: 'translateX(0)',
        });
        animationLayer.appendChild(clone);
        return clone;
    });

    // Hide original elements
    selectedItem.style.visibility = 'hidden';
    if (pinnedItem) pinnedItem.style.visibility = 'hidden';
    pileArray.forEach(el => (el.style.visibility = 'hidden'));

    // Helper for chained transitions using promises
    const waitTransitionEnd = (element) => {
        return new Promise(resolve => {
            const onEnd = (e) => {
                if (e.target === element && e.propertyName === 'transform') {
                    element.removeEventListener('transitionend', onEnd);
                    resolve();
                }
            };
            element.addEventListener('transitionend', onEnd);
        });
    };

    // Start animation chain
    (async () => {
        // Step 1: Selected word moves DOWN (easeIn)
        selectedClone.style.transform = 'translateY(20px)';
        await waitTransitionEnd(selectedClone);

        // Step 2: Selected word moves LEFT to pinned x (easeOut)
        selectedClone.style.transition = 'transform 400ms cubic-bezier(0.215, 0.61, 0.355, 1)'; // easeOut
        const dxSelected = pinnedBox.left - selectedBox.left;
        selectedClone.style.transform = `translate(${dxSelected}px, 20px)`;

        // At the same time start pinned word moving DOWN (easeOut)
        if (pinnedClone) {
            pinnedClone.style.transform = 'translateY(30px)';
        }

        // After small delay start pile words moving RIGHT (easeInOut)
        setTimeout(() => {
            pileClones.forEach(clone => {
                clone.style.transform = `translateX(${selectedBox.width}px)`;
            });
        }, 100); // 100ms head start after selected moves left

        await waitTransitionEnd(selectedClone);

        // Step 3: Selected word moves UP to pinned y (easeOut)
        selectedClone.style.transition = 'transform 300ms cubic-bezier(0.215, 0.61, 0.355, 1)';
        selectedClone.style.transform = `translate(${dxSelected}px, 0)`;
        // Pinned word moves RIGHT to empty spot x (easeOut)
        let dxPinned;
        if (pinnedClone) {
            dxPinned = selectedBox.left - pinnedBox.left;
            pinnedClone.style.transition = 'transform 400ms cubic-bezier(0.215, 0.61, 0.355, 1)';
            pinnedClone.style.transform = `translate(${dxPinned}px, 30px)`;
        }
        await waitTransitionEnd(selectedClone);

        // Step 4: Pinned word moves UP to pile y (easeInOut)
        if (pinnedClone) {
            pinnedClone.style.transition = 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)';
            pinnedClone.style.transform = `translate(${dxPinned}px, 0)`;
            await waitTransitionEnd(pinnedClone);
        }

        // Cleanup
        animationLayer.remove();
        selectedItem.style.visibility = '';
        if (pinnedItem) pinnedItem.style.visibility = '';
        pileArray.forEach(el => (el.style.visibility = ''));

        console.log('[wordplay-animation] Chained animation complete');
        if (typeof onComplete === 'function') onComplete();
    })();
}

function updateWordplayZones(path) {
    const wordplayHeader = document.getElementById('wordplay-header');
    const pileZone = wordplayHeader?.querySelector('.zone-pile');
    const pinnedZone = wordplayHeader?.querySelector('.zone-pinned');

    if (!pileZone || !pinnedZone || !window.fullWordList) return;

    requestAnimationFrame(() => {
        // Clear zones
        pileZone.innerHTML = '';
        pinnedZone.innerHTML = '';

        let matched = false;

        window.fullWordList.forEach(clone => {
            const clonePath = new URL(clone.querySelector('a').href).pathname.replace(/^\/|\/$/g, '');
            if (clonePath === path) {
                clone.classList.add('pinned-word');
                pinnedZone.appendChild(clone);
                matched = true;
                console.log('[barba] Matched pinned word: –', clonePath);
            } else {
                pileZone.appendChild(clone);
            }
        });

        if (!matched) {
            console.warn('[barba] No matching pile word for current page: –', path);
        }

        const main = document.querySelector('main');
        if (main) {
            main.style.opacity = '1';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[wordplay] DOMContentLoaded fired');

    const wordplayHeader = document.getElementById('wordplay-header');
    if (!wordplayHeader) return console.error('[wordplay] No #wordplay-header found');

    const pileZone = wordplayHeader.querySelector('.zone-pile');
    const pinnedZone = wordplayHeader.querySelector('.zone-pinned');
    if (!pileZone || !pinnedZone) return console.error('[wordplay] Missing zones');

    // Store full list for state restoration
    window.fullWordList = Array.from(pileZone.children).map(el => el.cloneNode(true));

    // Click handler for word pile
    pileZone.addEventListener('click', e => {
        const selectedItem = e.target.closest('.word-item');
        if (!selectedItem) return console.warn('[wordplay] Clicked outside word-item');

        e.preventDefault();
        const link = selectedItem.querySelector('a');
        if (!link || !link.href) return console.warn('[wordplay] No href found in word-item');

        const href = link.href;
        const pinnedItem = pinnedZone.querySelector('.word-item');
        const pileItems = pileZone.querySelectorAll('.word-item');

        // Save animation context for use in Barba transition
        window.wordplayTransition = {
            selectedItem,
            pinnedItem,
            pileItems,
            pileZone,
            pinnedZone,
            href
        };

        // Save href for transition
        window.wordplayTransition = {
            selectedItem,
            pinnedItem,
            pileItems,
            pileZone,
            pinnedZone,
            href
        };

        // Let Barba handle the navigation later, during leave()
        console.log('[app] Word pile clicked: –', href);
    });

    barba.hooks.afterEnter(() => {
        console.log('[barba] afterEnter: –', window.location.pathname);

        const path = window.location.pathname.replace(/^\/|\/$/g, '');
        updateWordplayZones(path);
    });
    
    barba.use(barbaCss);
    barba.init({
        sync: true,
        transitions: [{
            name: 'wordplay-transition',

            leave(data) {
                const ctx = window.wordplayTransition;
                console.log('[barba] Running FLIP animation via animateWordSwapAnimation()');
                if (ctx && animateWordSwapAnimation) {
                    return new Promise(resolve => {
                        animateWordSwapAnimation(ctx, resolve);
                    });
                }
                return Promise.resolve();
            },
            enter(data) {
                console.log('[barba] Entering new page');
                // fade-in handled by CSS (barba/css)
            },

            once(data) {
                // initial page load animations if needed
            },
        }]
    });
});