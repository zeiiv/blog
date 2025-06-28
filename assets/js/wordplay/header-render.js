import { SELECTORS, EVENTS, ANIM, STORAGE_KEYS, BREAKPOINTS } from "./config.js";
import { blockInteractions, safeUnblock, getQuickTween, saveOrder } from "./dom-helpers.js";
import { animateSwap, animatePlaceFlip } from "./animations.js";
import { safeUnblock }                  from "./dom-helpers.js";
import { animManager }                  from "./anim-manager.js";

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
export const renderHeader = (slug, animateFlip = true) => { // rebuild header zones

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
    const flipState = Flip.getState([...placeZone.children, ...pinnedZone.children, ...pileZone.children]);
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

    workingList.forEach(({ id, element }) => {
        if (id === effectiveSlug) pinnedFrag.appendChild(element);
        else pileFrag.appendChild(element);
    });

    pinnedZone.innerHTML = "";
    pileZone.innerHTML = "";
    pinnedZone.appendChild(pinnedFrag);
    pileZone.appendChild(pileFrag);
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
        Flip.from(flipState, { duration: ANIM.durations.header, ease: ANIM.eases.flat });
    }
};

export const initHeaderInteractions = renderHeaderFn => {

    const pileZone = document.querySelector(SELECTORS.pileZone);

    const mm = gsap.matchMedia();

    // tiny utility – true when the mobile query is live
    const isMobileViewport = () =>
        mm.conditions
            ? mm.conditions[BREAKPOINTS.mobile]      // preferred (GSAP ≥3.12)
            : window.matchMedia(BREAKPOINTS.mobile).matches; // fallback

    mm.add(BREAKPOINTS.mobile, () => {
        function collapse() {
            gsap.to(pileZone, {
                height: 0,
                duration: ANIM.durations.clickRipple,
                ease: ANIM.eases.flat
            });
        }
        function expand() {
            gsap.to(pileZone, {
                height: pileZone.scrollHeight,
                duration: ANIM.durations.clickRipple,
                ease: ANIM.eases.bounce
            });
        }
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

        // ---- PREP ----------------------------------------------------------------
        // Currently‑pinned element (may be null on home page)
        const oldEl = pinnedZone.querySelector(".word-item");
        // Word element that was just clicked in the pile
        const selectedEl = fullWordList.find(item => item.id === slug).element;

        // Capture Flip state *before* any DOM mutations
        const flipState = Flip.getState([selectedEl, oldEl].filter(Boolean));

        // ---- MUTATE DOM -----------------------------------------------------------
        // Re‑order header zones, but suppress its internal Flip
        renderHeader(slug, false);

        // New pinned element (now sitting in .zone‑pinned)
        const newEl = pinnedZone.querySelector(".word-item");
        const dropDist = newEl.offsetHeight * ANIM.values.dipFactor;
        const clickDur = ANIM.durations.clickRipple;

        // Block user interaction during the sequence
        const blockEls = [header, pileZone, pinnedZone, placeZone, langToggle];
        blockInteractions(blockEls);

        // Shrink the pile immediately so it isn’t hit‑tested during animation
        if (isMobileViewport()) {
            pileZone.dispatchEvent(new Event(EVENTS.PILE_SHRINK));
        }

        // ---- RUN ANIMATION --------------------------------------------------------
        const flipTl    = animateSwap(flipState, newEl, [header,pileZone,pinnedZone,placeZone,langToggle], isMobileViewport);
        safeUnblock(flipTl, [header,pileZone,pinnedZone,placeZone,langToggle]);
        animManager.registerTimeline(flipTl);

        // Begin page‑transition through Barba
        barba.go(link.href);
    };

    // Handle clicking the "place" static word
    const onPlaceClick = e => {
        if (bodyClasses.contains(CLASSNAMES.transitioning)) return;
        e.preventDefault();         // prevent full reload
        prevPinnedSlug = null;      // clear any pinned slug
        blockInteractions([header, pileZone, pinnedZone, placeZone, langToggle]);
        placeZone.dispatchEvent(new Event(EVENTS.PLACE_CLICK));
        renderHeader('place');
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

        // Determine zone
        if (item.closest(SELECTORS.pileZone)) {
            // pile: vertical nudge
            getQuickTween(item, "y", {
                duration: ANIM.durations.hover,
                ease: ANIM.eases.bounce,
                overwrite: "auto"
            })(-ANIM.values.hoverNudge);
        } else {
            // pinned or place: scale up
            getQuickTween(item, "scale", {
                duration: ANIM.durations.hover,
                ease: ANIM.eases.bounce,
                overwrite: "auto"
            })(1.2);
        }
    });

    header.addEventListener("mouseout", e => {
        const item = e.target.closest(".word-item");
        if (!item) return;

        if (item.closest(SELECTORS.pileZone)) {
            getQuickTween(item, "y", {
                duration: ANIM.durations.hover,
                ease: ANIM.eases.bounce,
                overwrite: "auto"
            })(0);
        } else {
            getQuickTween(item, "scale", {
                duration: ANIM.durations.hover,
                ease: ANIM.eases.bounce,
                overwrite: "auto"
            })(1);
        }
    });

    pileZone.addEventListener("click", onPileClick);
    pinnedZone.addEventListener("click", onPinnedClick);
    placeZone.addEventListener("click", onPlaceClick);

    // Persistent place‐click Flip
    animManager.registerPersistent(
        gsap.context(() => {
        placeZone.addEventListener(EVENTS.PLACE_CLICK, () => {
        const tl = animatePlaceFlip(pileZone.children);
        safeUnblock(tl, [header,pileZone,pinnedZone,placeZone,langToggle]);
    });
  }, placeZone)
);

};