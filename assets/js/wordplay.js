// Media query for responsive behaviors (global)
const mobileQuery = window.matchMedia("(max-width: 600px)");
// Expose for debugging
window.mobileQuery = mobileQuery;
import gsap from "https://cdn.skypack.dev/gsap@3.12.5"; // GSAP core
import { Flip } from "https://cdn.skypack.dev/gsap@3.12.5/Flip"; // GSAP FLIP plugin
import barba from "https://cdn.skypack.dev/@barba/core@2.10.3"; // Barba.js page transitions
gsap.registerPlugin(Flip); // register FLIP
import { CustomEase } from "https://cdn.skypack.dev/gsap@3.12.5/CustomEase"; // GSAP CustomEase plugin
gsap.registerPlugin(CustomEase);
// Define a flat ease that only eases at start/end with constant mid-phase
CustomEase.create("flatEase", "M0,0 C0.15,0.15 0.85,0.85 1,1");
/** DOM selectors & class names **/
const SELECTORS = {
  header:      "#wordplay-header",
  pileZone:    ".zone-pile",
  pinnedZone:  ".zone-pinned",
  placeZone:   ".zone-place",
  langToggle:  "#lang-toggle",
  wrapper:     "[data-barba='wrapper']",
  container:   "[data-barba='container']",
  wordLink:    "a[data-id]"
};
const CLASSNAMES = {
  transitioning: "is-transitioning"
};
/** Storage keys & language class names **/
const STORAGE_KEYS = {
  pileOrder: 'place-pile-order',
  lang:      'place-lang'
};
const LANG_CLASSES = {
  en: 'lang--en',
  he: 'lang--he'
};
/** Animation Configuration and Helpers **/
const ANIM_CONFIG = {
  durations: {
    fade: 0.5,
    header: 0.5,            // matches fade * 2
    hover: 0.3,
    clickRipple: 0.6
  },
  eases: {
    flat: "flatEase",
    bounce: "back.out(1.7)"
  }
};

// Global animation manager to track and kill animations
const animManager = {
  persistentContexts: [],
  timelines: [],
  // register a context that should stick around (do not revert on click)
  registerPersistent(ctx) { this.persistentContexts.push(ctx); return ctx; },
  // register a one-off swap timeline
  registerTimeline(tl)    { this.timelines.push(tl);       return tl; },
  // only kill swap timelines (never revert persistent contexts)
  killAllTimelines() {
    this.timelines.forEach(tl => tl.kill && tl.kill());
    this.timelines = [];
  }
};


// Throttling utility for intensive events
function throttle(fn, wait) {
  let last = 0;
  return function(...args) {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn.apply(this, args);
    }
  };
}
/** Pure helpers **/
// Compute slide offset based on language
function getDirOffset(lang, amount = 50) {
  return lang === "he" ? -amount : amount;
}
// Normalize Barba namespace to slug
function normalizeSlug(ns) {
  return Array.isArray(ns) ? ns[0] : ns;
}
// LocalStorage utilities for JSON arrays
function saveOrder(key, arr) {
  try { localStorage.setItem(key, JSON.stringify(arr)); } catch {}
}
function loadOrder(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}

document.addEventListener("DOMContentLoaded", () => {    // WHEN DOM IS LOADED

  let prevPinnedSlug = null;                             // reset previously pinned slug
  let currentLang;                                       // Track current language

  const FADE_DURATION = ANIM_CONFIG.durations.fade;
  const HEADER_ANIM_DURATION = ANIM_CONFIG.durations.header;

  const header = document.querySelector(SELECTORS.header);      // header element
  const pileZone = header.querySelector(SELECTORS.pileZone);            // pile container
  const pinnedZone = header.querySelector(SELECTORS.pinnedZone);        // pinned container
  const placeZone = header.querySelector(SELECTORS.placeZone);          // place container
  const WORD_LINK_SELECTOR = SELECTORS.wordLink;                        // selector for word links
  const langToggle = document.querySelector(SELECTORS.langToggle);      // language switcher text container

  const html = document.documentElement;
  const body = document.body;                                       // document body
  const htmlClasses = html.classList;
  const bodyClasses = body.classList;
  const wrapper = document.querySelector(SELECTORS.wrapper); // Barba wrapper

  // Interaction blocking utilities
  function blockInteractions() {
    bodyClasses.add(CLASSNAMES.transitioning);
    pileZone.style.pointerEvents = 'none';
    pinnedZone.style.pointerEvents = 'none';
    placeZone.style.pointerEvents = 'none';
    if (langToggle) langToggle.style.pointerEvents = 'none';
  }
  function unblockInteractions() {
    bodyClasses.remove(CLASSNAMES.transitioning);
    pileZone.style.pointerEvents = '';
    pinnedZone.style.pointerEvents = '';
    placeZone.style.pointerEvents = '';
    if (langToggle) langToggle.style.pointerEvents = '';
  }


  // --- Language Switching Functions ---
  function initLanguageSwitcher() {
    if (!langToggle) return;
    // Initialize from existing body class or storage
    currentLang = htmlClasses.contains(LANG_CLASSES.he)
      ? 'he'
      : localStorage.getItem(STORAGE_KEYS.lang) || 'en';
    //applyLanguage(currentLang, false);
    langToggle.addEventListener('click', () => toggleLanguage());
  }
  
  function toggleLanguage() {
    const newLang = currentLang === 'en' ? 'he' : 'en';
    // Fade out main content
    const content = document.querySelector(SELECTORS.container);
    gsap.to(content, {
      autoAlpha: 0,
      duration: 0.3,
      onComplete: () => {
        // Capture header state for Flip
        const flipState = Flip.getState([...placeZone.children, ...pinnedZone.children, ...pileZone.children, langToggle]);
        // Apply new language
        applyLanguage(newLang, true);

        langToggle.dispatchEvent(new Event("language-toggle-anim"));
        // Animate header word positions via Flip
        Flip.from(flipState, { duration: HEADER_ANIM_DURATION, ease: ANIM_CONFIG.eases.flat });
        // Animate the language toggle button with a pulse
        gsap.fromTo(langToggle, 
          { scale: 1.2 }, 
          { scale: 1, duration: 0.3, ease: ANIM_CONFIG.eases.bounce }
        );
        // Fade main content back in
        gsap.to(content, { autoAlpha: 1, duration: 0.3 });
      }
    });
  }

  function applyLanguage(lang, save) {
    console.log("Setting <html> lang to", lang);
    currentLang = lang;

    // toggle HTML classes for immediate root-level styling
    htmlClasses.toggle('lang--he', lang === 'he');
    htmlClasses.toggle('lang--en', lang === 'en');

    // Set both the attribute and the property on <html>
    html.setAttribute('lang', lang);
    html.lang = lang;      // ensures the inspector updates

    // Set direction on <html>
    const dir = lang === 'he' ? 'rtl' : 'ltr';
    html.setAttribute('dir', dir);

    if (save) localStorage.setItem(STORAGE_KEYS.lang, lang);
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
  }

  function getSlugFromItem(itemEl) {   // return the slug of a word-item
    if (!itemEl) return null;
    const link = itemEl.querySelector(WORD_LINK_SELECTOR); // find the <a>
    return link?.dataset.id || null;
  }

  function getPinnedSlug() { // return the currently pinned slug
    const pinnedItem = pinnedZone.querySelector(".word-item");
    return getSlugFromItem(pinnedItem);
  }

  function onPileClick(e) {  // click handler for pile navigation
    if (bodyClasses.contains(CLASSNAMES.transitioning)) return;
    animManager.killAllTimelines();
    const link = e.target.closest(WORD_LINK_SELECTOR);
    if (!link) return;
    e.preventDefault();               // stop full reload
    e.stopImmediatePropagation();

    const slug = link.dataset.id;
    if (slug === getPinnedSlug()) return;  // no-op if already pinned

    // capture old pinned element before DOM reorder
    const oldEl = pinnedZone.querySelector(".word-item");

    // Capture pre-swap element and initial offsets before FLIP
    const preNewEl = fullWordList.find(item => item.id === slug).element;
    const pinnedRect = pinnedZone.getBoundingClientRect();
    const pileRect = preNewEl.getBoundingClientRect();
    const dx = pileRect.left - pinnedRect.left;
    const dy = pileRect.top - pinnedRect.top;

    // Animate header immediately into new positions
    updateWordplayZones(slug);

    // trigger swap animations after header Flip completes
    gsap.delayedCall(HEADER_ANIM_DURATION, () => {
      const isMobile = mobileQuery.matches;
      // shrink the pile
      pileZone.dispatchEvent(new Event(isMobile ? "pile-shrink-mobile" : "pile-shrink-desktop"));
      // inline swap animation timeline (drop → slide via FLIP → rise)
      const newEl = pinnedZone.querySelector(".word-item");
      // Clear any lingering hover-induced transforms before swapping
      gsap.set([ newEl, oldEl ].filter(Boolean), { clearProps: 'transform' });
      const swapState = Flip.getState(newEl);
      const clickDur = ANIM_CONFIG.durations.clickRipple;
      const seg = clickDur / 3;
      const swapTl = gsap.timeline();
      // 1) drop down
      swapTl.to(newEl, { y: 20, duration: seg, ease: ANIM_CONFIG.eases.flat });
      // 2) slide across via FLIP
      swapTl.add(Flip.from(swapState, {
        duration: seg,
        ease: ANIM_CONFIG.eases.flat,
        absolute: true
      }));
      // 3) rise up
      swapTl.to(newEl, { y: 0, duration: seg, ease: ANIM_CONFIG.eases.flat });
      // shift oldEl back in parallel
      if (oldEl) {
        const tgt = pileZone.children[0];
        const dx2 = tgt.getBoundingClientRect().left - oldEl.getBoundingClientRect().left;
        swapTl.to(oldEl, { x: dx2, duration: clickDur, ease: ANIM_CONFIG.eases.flat }, 0);
      }
      // clear inline transforms and expand pile when done
      swapTl
        .set([ newEl, oldEl ].filter(Boolean), { clearProps: 'transform' })
        .add(() => {
          pileZone.dispatchEvent(new Event(isMobile ? "pile-expand-mobile" : "pile-expand-desktop"));
        });
      animManager.registerTimeline(swapTl);
    });

    // Disable further clicks and mark transitioning
    blockInteractions();

    // Start content transition
    barba.go(link.href);
  }

  // stop browser from reloading  
  function stopReload(targetLink) {
    const link = targetLink.target.closest(WORD_LINK_SELECTOR);
    if (!link) return;
    targetLink.preventDefault();
  }

  // reset click guard and cleanup
  function resetTransitionGuard() {
    // clear transition guard and re-enable interactions
    unblockInteractions();
    pileZone.addEventListener("click", onPileClick);
  }

  // Adjust wrapper height on window resize during transition
  function onResize() {
    const currentContainer = document.querySelector(SELECTORS.container);
    if (currentContainer) {
      wrapper.style.minHeight = `${currentContainer.offsetHeight}px`;
    }
  }

  // build list of {id, template} once
  const fullWordList = Array.from(pileZone.children)
    .concat(Array.from(pinnedZone.children))
    .map(el => {
      const link = el.querySelector(WORD_LINK_SELECTOR);
      return { id: link.dataset.id, element: el };
    });

  // Flag to skip Flip animation on initial load
  let isInitialRender = true;

  // Load saved pile ordering from localStorage
  try {
    const savedOrder = loadOrder(STORAGE_KEYS.pileOrder);
    if (Array.isArray(savedOrder) && savedOrder.length) {
      fullWordList.sort((a, b) => savedOrder.indexOf(a.id) - savedOrder.indexOf(b.id));
    }
  } catch (e) {
    console.warn("[wordplay] could not load saved pile order", e);
  }

  // list of valid slugs for quick lookup
  const allIds = fullWordList.map(item => item.id);

  // set initial header based on page
  const mainContainer = document.querySelector(SELECTORS.container);
  const initialSlug = mainContainer.getAttribute("data-barba-namespace");
  updateWordplayZones(initialSlug);

  // rebuild header zones based on slug
  function updateWordplayZones(slug) { // rebuild header zones
    // Capture current word positions for Flip animation
    const flipState = Flip.getState([...placeZone.children, ...pinnedZone.children, ...pileZone.children]);
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
    // Animate items into their new positions (skip on initial load)
    if (!isInitialRender) {
      Flip.from(flipState, { duration: HEADER_ANIM_DURATION, ease: ANIM_CONFIG.eases.flat });
    } else {
      isInitialRender = false;
    }
  }

  // Handle clicking the "place" static word
function onPlaceClick(e) {
    if (bodyClasses.contains(CLASSNAMES.transitioning)) return;
    animManager.killAllTimelines();
    e.preventDefault();         // prevent full reload
    prevPinnedSlug = null;      // clear any pinned slug
    blockInteractions();
    placeZone.dispatchEvent(new Event("place-click-anim"));
    updateWordplayZones('place');
  }

// Persistent place-click context
animManager.registerPersistent(
  gsap.context(() => {
    placeZone.addEventListener("place-click-anim", () => {
      const flipState = Flip.getState(pileZone.children);
      Flip.from(flipState, { duration: HEADER_ANIM_DURATION, ease: ANIM_CONFIG.eases.flat });
    });
  }, placeZone)
);

// Persistent language-toggle context
animManager.registerPersistent(
  gsap.context(() => {
    langToggle.addEventListener("language-toggle-anim", () => {
      const flipState = Flip.getState([
        ...placeZone.children,
        ...pinnedZone.children,
        ...pileZone.children,
        langToggle
      ]);
      Flip.from(flipState, { duration: HEADER_ANIM_DURATION, ease: ANIM_CONFIG.eases.flat });
      gsap.fromTo(langToggle,
        { scale: 1.2 },
        { scale: 1, duration: ANIM_CONFIG.durations.hover, ease: ANIM_CONFIG.eases.bounce }
      );
    });
  }, header)
);

// Persistent hover for pileZone
animManager.registerPersistent(
  gsap.context(() => {
    pileZone.addEventListener("mouseover", e => {
      if (bodyClasses.contains(CLASSNAMES.transitioning)) return;
      const item = e.target.closest(".word-item");
      if (!item) return;
      gsap.to(item, { y: -3, duration: ANIM_CONFIG.durations.hover, ease: ANIM_CONFIG.eases.bounce });
    });
    pileZone.addEventListener("mouseout", e => {
      if (bodyClasses.contains(CLASSNAMES.transitioning)) return;
      const item = e.target.closest(".word-item");
      if (!item) return;
      gsap.to(item, { y: 0, duration: ANIM_CONFIG.durations.hover, ease: ANIM_CONFIG.eases.bounce });
    });
  }, pileZone)
);

// Persistent hover for pinnedZone
animManager.registerPersistent(
  gsap.context(() => {
    pinnedZone.addEventListener("mouseover", e => {
      if (bodyClasses.contains(CLASSNAMES.transitioning)) return;
      const item = e.target.closest(".word-item");
      if (!item) return;
      gsap.to(item, { scale: 1.2, duration: ANIM_CONFIG.durations.hover, ease: ANIM_CONFIG.eases.bounce });
    });
    pinnedZone.addEventListener("mouseout", e => {
      if (bodyClasses.contains(CLASSNAMES.transitioning)) return;
      const item = e.target.closest(".word-item");
      if (!item) return;
      gsap.to(item, { scale: 1, duration: ANIM_CONFIG.durations.hover, ease: ANIM_CONFIG.eases.bounce });
    });
  }, pinnedZone)
);

// Persistent hover for placeZone
animManager.registerPersistent(
  gsap.context(() => {
    placeZone.addEventListener("mouseover", e => {
      if (bodyClasses.contains(CLASSNAMES.transitioning)) return;
      const item = e.target.closest(".word-item");
      if (!item) return;
      gsap.to(item, { scale: 1.2, duration: ANIM_CONFIG.durations.hover, ease: ANIM_CONFIG.eases.bounce });
    });
    placeZone.addEventListener("mouseout", e => {
      if (bodyClasses.contains(CLASSNAMES.transitioning)) return;
      const item = e.target.closest(".word-item");
      if (!item) return;
      gsap.to(item, { scale: 1, duration: ANIM_CONFIG.durations.hover, ease: ANIM_CONFIG.eases.bounce });
    });
  }, placeZone)
);

// 6–8 STOCK CONTEXT LOADER (DESKTOP vs MOBILE)
let desktopCtxs = [], mobileCtxs = [];

function initDesktopContexts() {
  const ctxs = [];

  // Persistent desktop pile-shrink/expand
  animManager.registerPersistent(
    gsap.context(() => {
      function shrink() {
        gsap.to(pileZone, {
          scaleY: 0.9,
          transformOrigin: "top center",
          duration: ANIM_CONFIG.durations.clickRipple,
          ease: ANIM_CONFIG.eases.flat
        });
      }
      function expand() {
        gsap.from(pileZone, {
          scaleY: 0.9,
          transformOrigin: "top center",
          duration: ANIM_CONFIG.durations.clickRipple,
          ease: ANIM_CONFIG.eases.bounce
        });
      }
      pileZone.addEventListener("pile-shrink-desktop", shrink);
      pileZone.addEventListener("pile-expand-desktop", expand);
    }, pileZone)
  );

  return ctxs;
}

function initMobileContexts() {
  const ctxs = [];

  // 7.1 PILE-ANIMATION-MOBILE
  // Persistent mobile pile-shrink/expand
  animManager.registerPersistent(
    gsap.context(() => {
      function collapse() {
        gsap.to(pileZone, {
          height: 0,
          duration: ANIM_CONFIG.durations.clickRipple,
          ease: ANIM_CONFIG.eases.flat
        });
      }
      function expand() {
        gsap.to(pileZone, {
          height: pileZone.scrollHeight,
          duration: ANIM_CONFIG.durations.clickRipple,
          ease: ANIM_CONFIG.eases.bounce
        });
      }
      pileZone.addEventListener("pile-shrink-mobile", collapse);
      pileZone.addEventListener("pile-expand-mobile", expand);
    }, pileZone)
  );

  return ctxs;
}

// viewport switcher
function handleViewportChange(e) {
  desktopCtxs.forEach(c => c.revert());
  mobileCtxs.forEach(c => c.revert());
  desktopCtxs = [];
  mobileCtxs  = [];

  if (e.matches) mobileCtxs = initMobileContexts();
  else           desktopCtxs = initDesktopContexts();
}
mobileQuery.addEventListener("change", handleViewportChange);
handleViewportChange(mobileQuery);

  // --- Event Listeners ---
  pileZone.addEventListener("click", onPileClick);
  pinnedZone.addEventListener("click", stopReload);
  placeZone.removeEventListener("click", stopReload);
  placeZone.addEventListener("click", onPlaceClick);

  // Initialize language switcher
  initLanguageSwitcher();

  // --- Barba.js Integration ---
  barba.init({
    transitions: [{
      name: "wordplay-fade",
      sync: false,

      // fade out old page and lock footer
      leave({ current }) {
        animManager.killAllTimelines();
        prevPinnedSlug = getPinnedSlug();                   // remember old pin
        wrapper.style.minHeight = `${current.container.offsetHeight}px`;
        // Listen for window resize to maintain wrapper height
        window.addEventListener('resize', throttle(onResize, 200));
        // Determine slide direction based on language: en → right, he → left
        const dir = getDirOffset(currentLang);
        // Capture header state for FLIP if needed (before fade)
        // const flipState = Flip.getState([...placeZone.children, ...pinnedZone.children, ...pileZone.children]);
        return gsap.timeline()
          .to(current.container, {
            autoAlpha: 0,
            x: dir,
            duration: FADE_DURATION,
            ease: 'power1.inOut'
          }, 0)
          .then(() => {
            wrapper.style.minHeight = "";  // clear height lock
          })
          .catch(err => {
            console.error("[wordplay] leave animation error:", err);
          })
          .finally(() => {
            // Always remove resize listener to prevent memory leaks
            window.removeEventListener('resize', onResize);
          });
      },

      beforeEnter({ next }) { // prepare incoming page
        const slug = normalizeSlug(next.namespace); // normalize slug
        updateWordplayZones(slug); // always sync header based on slug
        // Determine slide direction for incoming content (reverse of leave)
        const dir = getDirOffset(currentLang);
        gsap.set(next.container, { autoAlpha: 0, x: dir, visibility: "visible" });
      },

      // fade in new page
      enter({ next }) {
        // Slide- and fade-in incoming content
        const dir = getDirOffset(currentLang);
        return new Promise(resolve => {
          // Start fade-in of new page content
          gsap.to(next.container, {
            autoAlpha: 1,
            x: 0,
            duration: FADE_DURATION,
            ease: 'power1.inOut'
          });
          // Wait for both header flip and content transition to finish before re-enabling interactions
          gsap.delayedCall(HEADER_ANIM_DURATION, () => {
            resetTransitionGuard();
            resolve();
          });
        });
      },
    }],
  });

  // Fallback for history navigation: only re-sync header on popstate
  // Checks for 
  barba.hooks.after(({ next, trigger }) => {
    if (trigger === "popstate") {
      // normalize namespace to slug
      const slug = normalizeSlug(next.namespace);
      updateWordplayZones(slug)
    }
    resetTransitionGuard()
  });

  // Ensure header and zones are visible initially
  gsap.set([header, pileZone, pinnedZone], { autoAlpha: 1 });
});