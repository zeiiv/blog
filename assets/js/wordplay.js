import gsap from "https://cdn.skypack.dev/gsap@3.12.5"; // GSAP core
import { Flip } from "https://cdn.skypack.dev/gsap@3.12.5/Flip"; // GSAP FLIP plugin
import barba from "https://cdn.skypack.dev/@barba/core@2.10.3"; // Barba.js page transitions
gsap.registerPlugin(Flip); // register FLIP

document.addEventListener("DOMContentLoaded", () => {    // WHEN DOM IS LOADED

  let prevPinnedSlug = null;                             // reset previously pinned slug
  let currentLang;                                       // Track current language

  const HEADER_ANIM_DURATION = 1;                        // header FLIP duration (s)
  const FADE_DURATION = HEADER_ANIM_DURATION / 2;        // content fade duration (s)

  const header = document.getElementById("wordplay-header");      // header element
  const pileZone = header.querySelector(".zone-pile");            // pile container
  const pinnedZone = header.querySelector(".zone-pinned");        // pinned container
  const placeZone = header.querySelector(".zone-place");          // place container
  const WORD_LINK_SELECTOR = 'a[data-id]';                        // selector for word links
  const langToggle = document.getElementById("lang-toggle");      // language switcher text container

  const html = document.documentElement;
  const body = document.body;                                       // document body
  const htmlClasses = html.classList;
  const bodyClasses = body.classList;
  const wrapper = document.querySelector('[data-barba="wrapper"]'); // Barba wrapper

  // --- Language Switching Functions ---
  function initLanguageSwitcher() {
    if (!langToggle) return;
    // Initialize from existing body class or storage
    currentLang = htmlClasses.contains('lang--he')
      ? 'he'
      : localStorage.getItem('place-lang') || 'en';
    //applyLanguage(currentLang, false);
    langToggle.addEventListener('click', () => toggleLanguage());
  }
  
  function toggleLanguage() {
    const newLang = currentLang === 'en' ? 'he' : 'en';
    // Fade out main content
    const content = document.querySelector('[data-barba="container"]');
    gsap.to(content, {
      autoAlpha: 0,
      duration: 0.3,
      onComplete: () => {
        // Capture header state for Flip
        const flipState = Flip.getState([...placeZone.children, ...pinnedZone.children, ...pileZone.children, langToggle]);
        // Apply new language
        applyLanguage(newLang, true);
        // Animate header word positions via Flip
        Flip.from(flipState, { duration: 0.5, ease: 'power1.inOut' });
        // Animate the language toggle button with a pulse
        gsap.fromTo(langToggle, 
          { scale: 1.2 }, 
          { scale: 1, duration: 0.3, ease: 'back.out(1.7)' }
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

    if (save) localStorage.setItem('place-lang', lang);
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
    const link = e.target.closest(WORD_LINK_SELECTOR);
    if (!link) return;
    e.preventDefault();               // stop full reload
    e.stopImmediatePropagation();

    const slug = link.dataset.id;
    if (slug === getPinnedSlug()) return;  // no-op if already pinned

    // Animate header immediately into new positions
    updateWordplayZones(slug);

    // Disable further clicks and mark transitioning
    pileZone.removeEventListener("click", onPileClick);
    pileZone.style.pointerEvents = "none";
    bodyClasses.add("is-transitioning");

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
    bodyClasses.remove("is-transitioning"); // clear flag
    pileZone.style.pointerEvents = "";         // re-enable clicks
    pileZone.addEventListener("click", onPileClick); // reattach handler
  }

  // Adjust wrapper height on window resize during transition
  function onResize() {
    const currentContainer = document.querySelector('[data-barba="container"]');
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
    const savedOrder = JSON.parse(localStorage.getItem('place-pile-order') || '[]');
    if (Array.isArray(savedOrder) && savedOrder.length) {
      fullWordList.sort((a, b) => savedOrder.indexOf(a.id) - savedOrder.indexOf(b.id));
    }
  } catch (e) {
    console.warn("[wordplay] could not load saved pile order", e);
  }

  // list of valid slugs for quick lookup
  const allIds = fullWordList.map(item => item.id);

  // set initial header based on page
  const mainContainer = document.querySelector('[data-barba="container"]');
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
      localStorage.setItem('place-pile-order', JSON.stringify(orderToSave));
    } catch (e) {
      console.warn("[wordplay] could not save pile order", e);
    }
    // Reveal zones after ordering
    pileZone.style.visibility = 'visible';
    pinnedZone.style.visibility = 'visible';
    // Animate items into their new positions (skip on initial load)
    if (!isInitialRender) {
      Flip.from(flipState, { duration: 0.5, ease: 'power1.inOut' });
    } else {
      isInitialRender = false;
    }
  }

  // Handle clicking the "place" static word
  function onPlaceClick(e) {
    e.preventDefault();         // prevent full reload
    prevPinnedSlug = null;      // clear any pinned slug
    updateWordplayZones('place');
  }

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
        prevPinnedSlug = getPinnedSlug();                   // remember old pin
        wrapper.style.minHeight = `${current.container.offsetHeight}px`;
        // Listen for window resize to maintain wrapper height
        window.addEventListener('resize', onResize);
        return gsap.to(current.container, { autoAlpha: 0, duration: FADE_DURATION })
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
        const slug = Array.isArray(next.namespace) ? next.namespace[0] : next.namespace; // normalize slug
        updateWordplayZones(slug); // always sync header based on slug
        gsap.set(next.container, { autoAlpha: 0, visibility: "visible" });
      },

      // fade in new page
      enter({ next }) {
        return gsap.to(next.container, { autoAlpha: 1, duration: FADE_DURATION })
          .then(resetTransitionGuard)
          .catch(err => { console.error("[wordplay] enter error:", err); resetTransitionGuard(); });
      },
    }],
  });

  // Fallback for history navigation: only re-sync header on popstate
  // Checks for 
  barba.hooks.after(({ next, trigger }) => {
    if (trigger === "popstate") {
      // normalize namespace to slug
      const slug = Array.isArray(next.namespace) ? next.namespace[0] : next.namespace
      updateWordplayZones(slug)
    }
    resetTransitionGuard()
  });

  // Ensure header and zones are visible initially
  gsap.set([header, pileZone, pinnedZone], { autoAlpha: 1 });
});