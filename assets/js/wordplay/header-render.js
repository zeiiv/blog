import gsap, { barba } from "./vendor.js";
import { SELECTORS, EVENTS, STORAGE_KEYS, CLASSNAMES, BREAKPOINTS, ANIM } from "./config.js";
import { saveOrder, blockInteractions, unblockInteractions } from "./dom-helpers.js";
import { animatePlaceFlip, animateHeaderFlip, collapsePile, expandPile, animateHoverIn, animateHoverOut } from "./animations.js";
import { animManager } from "./anim-manager.js";

// DOM references
const header = document.querySelector(SELECTORS.header);
const pileZone = document.querySelector(SELECTORS.pileZone);
const pinnedZone = document.querySelector(SELECTORS.pinnedZone);
const placeZone = document.querySelector(SELECTORS.placeZone);
const bodyClasses = document.documentElement.classList;
const langToggle = document.querySelector(SELECTORS.langToggle);

let prevPinnedSlug = null;
export const getPrevPinnedSlug = () => prevPinnedSlug;
export const setPrevPinnedSlug = slug => { prevPinnedSlug = slug; };

// rebuild header zones based on slug
let lastRenderCall = { slug: null, timestamp: 0 };
export const renderHeader = (slug, animateFlip = true) => { // rebuild header zones
    console.log('[renderHeader] Called with:', { slug, animateFlip });
    
    // Prevent duplicate calls within 100ms
    const now = Date.now();
    if (lastRenderCall.slug === slug && (now - lastRenderCall.timestamp) < 100) {
        console.log('[renderHeader] Ignoring duplicate call');
        return;
    }
    lastRenderCall = { slug, timestamp: now };

    // build list of {id, template} once
    const fullWordList = Array.from(pileZone.children)
        .concat(Array.from(pinnedZone.children))
        .map(el => {
            const link = el.querySelector(SELECTORS.wordLink);
            return { id: link.dataset.id, element: el };
        });

    // Flag to skip Flip animation on initial load
    let isInitialRender = true;
    // Capture current word positions for Flip animation
    const flipElements = [...placeZone.children, ...pinnedZone.children, ...pileZone.children];
    // list of valid slugs for quick lookup
    const allIds = fullWordList.map(item => item.id);
    // Determine effective slug: exact match, parent for deep-link, or 404
    let effectiveSlug = slug;
    if (effectiveSlug !== 'place' && !allIds.includes(effectiveSlug)) {
        const parent = effectiveSlug.split("/")[0];
        if (allIds.includes(parent)) {
            effectiveSlug = parent; // use parent segment if valid
        } else {
            // 404 case: clear pinned, render full pile
            pinnedZone.innerHTML = "";
            pileZone.innerHTML = "";
            const frag404 = document.createDocumentFragment();
            fullWordList.forEach(({ element }) =>
                frag404.appendChild(element)
            );
            pileZone.appendChild(frag404);
            return;
        }
    }
    // use effectiveSlug for all subsequent operations

    const workingList = fullWordList; // mutate original to keep order

    // move previous pinned item to front when returning home or changing pages
    if (prevPinnedSlug) {
        const idx = workingList.findIndex(item => item.id === prevPinnedSlug);
        if (idx > -1) workingList.unshift(workingList.splice(idx, 1)[0]);
    }

    // normal and home-case rendering: split pinned vs. pile
    const pinnedFrag = document.createDocumentFragment();
    const pileFrag = document.createDocumentFragment();

    console.log('[renderHeader] Element distribution:', {
        slug: effectiveSlug,
        workingListOrder: workingList.map(item => item.id),
        pinnedItems: workingList.filter(item => item.id === effectiveSlug).map(item => item.id),
        pileItems: workingList.filter(item => item.id !== effectiveSlug).map(item => item.id)
    });

    workingList.forEach(({ id, element }) => {
        if (id === effectiveSlug) pinnedFrag.appendChild(element);
        else pileFrag.appendChild(element);
    });

    pinnedZone.innerHTML = "";
    pileZone.innerHTML = "";
    pinnedZone.appendChild(pinnedFrag);
    pileZone.appendChild(pileFrag);
    
    // Debug zone placement
    console.log('[renderHeader] Final DOM structure:', {
        placeZoneChildren: placeZone.children.length,
        pinnedZoneChildren: pinnedZone.children.length,
        pileZoneChildren: pileZone.children.length,
        pinnedZoneItems: Array.from(pinnedZone.children).map(el => el.querySelector('a')?.dataset.id),
        pileZoneItems: Array.from(pileZone.children).map(el => el.querySelector('a')?.dataset.id)
    });
    // Persist current pile ordering to localStorage
    try {
        const orderToSave = workingList.map(item => item.id);
        saveOrder(STORAGE_KEYS.pileOrder, orderToSave);
    } catch (e) {
        console.warn("[wordplay] could not save pile order", e);
    }
    // Reveal zones after ordering
    pileZone.style.visibility = 'visible';
    pinnedZone.style.visibility = 'visible';
    // Animate items into their new positions (skip on initial load or when explicitly suppressed)
    if (isInitialRender) {
        isInitialRender = false;
    } else if (animateFlip) {
        const flipAnimation = animateHeaderFlip(flipElements);
        if (flipAnimation) {
            animManager.registerTimeline(flipAnimation);
        }
    }
};

export const initHeaderInteractions = () => {

    const pileZone = document.querySelector(SELECTORS.pileZone);

    const mm = gsap.matchMedia();

    // tiny utility – true when the mobile query is live
    const isMobileViewport = () =>
        mm.conditions
            ? mm.conditions[BREAKPOINTS.mobile]      // preferred (GSAP ≥3.12)
            : window.matchMedia(BREAKPOINTS.mobile).matches; // fallback

    mm.add(BREAKPOINTS.mobile, () => {
        const collapse = () => {
            const tl = collapsePile(pileZone);
            if (tl) animManager.registerTimeline(tl);
        };
        const expand = () => {
            const tl = expandPile(pileZone);
            if (tl) animManager.registerTimeline(tl);
        };
        
        pileZone.addEventListener(EVENTS.PILE_SHRINK, collapse);
        pileZone.addEventListener(EVENTS.PILE_EXPAND, expand);
        return () => {
            pileZone.removeEventListener(EVENTS.PILE_SHRINK, collapse);
            pileZone.removeEventListener(EVENTS.PILE_EXPAND, expand);
        };
    });

    const getSlugFromItem = itemEl => {  // return the slug of a word-item
        if (!itemEl) return null;
        const link = itemEl.querySelector(SELECTORS.wordLink); // find the <a>
        return link?.dataset.id || null;
    };

    const getPinnedSlug = () => { // return the currently pinned slug
        const pinnedItem = pinnedZone.querySelector(".word-item");
        return getSlugFromItem(pinnedItem);
    };

    const onPileClick = e => {  // click handler for pile navigation
        if (bodyClasses.contains(CLASSNAMES.transitioning)) return;

        const link = e.target.closest(SELECTORS.wordLink);
        if (!link) return;

        e.preventDefault();            // stop full reload
        e.stopImmediatePropagation();

        const slug = link.dataset.id;
        if (slug === getPinnedSlug()) return;   // no‑op if already pinned
        
        // Prevent rapid clicks and check for ongoing animations
        if (onPileClick.lastClick && Date.now() - onPileClick.lastClick < 800) {
            console.log('[header-render] Ignoring rapid click');
            return;
        }
        
        // Check if there are ongoing animations
        if (animManager.timelines.length > 0) {
            console.log('[header-render] Ignoring click - animations in progress:', animManager.timelines.length);
            return;
        }
        
        onPileClick.lastClick = Date.now();

        // ---- PREP ----------------------------------------------------------------
        // Get current word list from DOM
        const fullWordList = Array.from(pileZone.children)
            .concat(Array.from(pinnedZone.children))
            .map(el => {
                const link = el.querySelector(SELECTORS.wordLink);
                return { id: link.dataset.id, element: el };
            });
        
        // Currently‑pinned element (may be null on home page)
        const oldEl = pinnedZone.querySelector(".word-item");
        // Word element that was just clicked in the pile
        const selectedEl = fullWordList.find(item => item.id === slug)?.element;
        
        console.log('[header-render] Pile click elements:', { 
            slug, 
            selectedEl: !!selectedEl, 
            oldEl: !!oldEl,
            fromElements: [selectedEl, oldEl].filter(Boolean).length
        });
        
        // Set the current pinned slug as previous for future ordering
        const currentPinned = getPinnedSlug();
        if (currentPinned && currentPinned !== slug) {
            prevPinnedSlug = currentPinned;
        }


        // ---- ANIMATION PREPARATION -----------------------------------------------
        // animateHeaderTransition will handle DOM changes and blocking

        // Shrink the pile immediately so it isn’t hit‑tested during animation
        if (isMobileViewport()) {
            pileZone.dispatchEvent(new Event(EVENTS.PILE_SHRINK));
        }

        // ---- RUN ANIMATION --------------------------------------------------------
        // High-level orchestration: handles state capture, DOM changes, animation, and navigation
        animManager.animateHeaderTransition({
            fromElements: [selectedEl, oldEl],
            getToElement: () => pinnedZone.querySelector(SELECTORS.wordItem),
            domChangeCallback: () => renderHeader(slug, false),
            navigationCallback: () => {
                // New approach: Immediate barba navigation with persistent header animation
                // Header animations run independently across page transitions
                console.log('[header-render] Starting immediate barba navigation with persistent header animation');
                
                // Make header position: fixed so it persists across page changes
                const headerElement = document.querySelector(SELECTORS.header);
                if (headerElement) {
                    headerElement.style.position = 'fixed';
                    headerElement.style.top = '0';
                    headerElement.style.left = '0';
                    headerElement.style.right = '0';
                    headerElement.style.zIndex = '9999';
                    headerElement.style.background = 'inherit';
                    console.log('[header-render] Header made persistent across page transitions');
                }
                
                // Start barba navigation immediately - header animation continues independently
                if (barba && typeof barba.go === 'function') {
                    try {
                        console.log('[header-render] Starting barba navigation immediately');
                        barba.go(link.href);
                    } catch (error) {
                        console.error('[header-render] Barba failed, using fallback:', error);
                        window.location.href = link.href;
                    }
                } else {
                    console.warn('[header-render] Barba not available, using direct navigation');
                    window.location.href = link.href;
                }
            },
            blockElements: [header, pileZone, pinnedZone, placeZone, langToggle]
        });
    };

    // Handle clicking the "place" static word
    const onPlaceClick = e => {
        if (bodyClasses.contains(CLASSNAMES.transitioning)) return;
        
        console.log('[header-render] Place click detected - current URL:', window.location.pathname);
        
        e.preventDefault();         // prevent full reload
        e.stopPropagation();        // prevent event bubbling
        e.stopImmediatePropagation(); // prevent other handlers
        
        // Save the currently pinned slug so it goes to front of pile
        const currentPinned = getPinnedSlug();
        if (currentPinned) {
            prevPinnedSlug = currentPinned;
            console.log('[header-render] Saving pinned slug for pile ordering:', prevPinnedSlug);
        }
        
        console.log('[header-render] Dispatching PLACE_CLICK event');
        placeZone.dispatchEvent(new Event(EVENTS.PLACE_CLICK));
        // renderHeader will be called by the place click animation
    };

    const onPinnedClick = e => {
        const link = e.target.closest(SELECTORS.wordLink);
        if (!link) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        barba.go(link.href);
    };

    // --- Delegated hover handling on the header ---
    header.addEventListener("mouseover", e => {
        if (bodyClasses.contains(CLASSNAMES.transitioning)) return;
        const item = e.target.closest(".word-item");
        if (!item) return;

        const isPileZone = !!item.closest(SELECTORS.pileZone);
        animateHoverIn(item, isPileZone);
    });

    header.addEventListener("mouseout", e => {
        const item = e.target.closest(".word-item");
        if (!item) return;

        const isPileZone = !!item.closest(SELECTORS.pileZone);
        animateHoverOut(item, isPileZone);
    });

    pileZone.addEventListener("click", onPileClick);
    pinnedZone.addEventListener("click", onPinnedClick);
    placeZone.addEventListener("click", onPlaceClick);

    // Persistent place‐click Flip
    console.log('[header-render] Setting up PLACE_CLICK event listener');
    animManager.registerContext(placeZone, () => {
        console.log('[header-render] Registering PLACE_CLICK event listener on:', placeZone);
        placeZone.addEventListener(EVENTS.PLACE_CLICK, () => {
            console.log('[header-render] PLACE_CLICK event fired');
            
            // Block interactions for place click
            const blockEls = [header, pileZone, pinnedZone, placeZone, langToggle];
            blockInteractions(blockEls);
            
            // Capture the pinned element BEFORE moving it
            const pinnedElement = pinnedZone.querySelector('.word-item');
            const pinnedElementData = pinnedElement ? {
                element: pinnedElement,
                id: pinnedElement.querySelector('a')?.dataset.id,
                rect: pinnedElement.getBoundingClientRect()
            } : null;
            
            console.log('[header-render] Captured pinned element before DOM change:', pinnedElementData?.id);
            
            // Move pinned item back to pile
            console.log('[header-render] Calling renderHeader from PLACE_CLICK handler');
            renderHeader('place', false);
            
            // Create animation with the captured data and current pile elements
            const tl = animatePlaceFlip(pileZone.children, pinnedElementData);
            
            // Add unblocking to completion
            tl.eventCallback("onComplete", function() {
                console.log('[header-render] Place flip completed, unblocking');
                unblockInteractions(blockEls);
            });
            
            tl.eventCallback("onInterrupt", function() {
                console.log('[header-render] Place flip interrupted, unblocking');
                unblockInteractions(blockEls);
            });
            
            console.log('[header-render] Place flip timeline created:', {
                duration: tl.duration(),
                totalDuration: tl.totalDuration(),
                progress: tl.progress()
            });
            
            animManager.registerTimeline(tl);
        });
    });

};