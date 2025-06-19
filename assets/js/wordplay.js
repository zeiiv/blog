import gsap from "https://cdn.skypack.dev/gsap@3.12.5"; // GSAP core
import { Flip } from "https://cdn.skypack.dev/gsap@3.12.5/Flip"; // GSAP FLIP plugin
import barba from "https://cdn.skypack.dev/@barba/core@2.10.3"; // Barba.js page transitions
gsap.registerPlugin(Flip); // register FLIP

document.addEventListener("DOMContentLoaded", () => {    // WHEN DOM IS LOADED

  let prevPinnedSlug = null;                             // reset previously pinned slug
  let currentLang = "en"                                 // Track current language

  const HEADER_ANIM_DURATION = 1;                        // header FLIP duration (s)
  const FADE_DURATION = HEADER_ANIM_DURATION / 2;        // content fade duration (s)

  const header = document.getElementById("wordplay-header");      // header element
  const pileZone = header.querySelector(".zone-pile");            // pile container
  const pinnedZone = header.querySelector(".zone-pinned");        // pinned container
  const placeZone = header.querySelector(".zone-place");          // place container
  const langToggle = document.getElementById("lang-toggle")       // language switcher text container

  header.classList.add("is-ready");                               // reveal header zones

  const wrapper = document.querySelector('[data-barba="wrapper"]'); // Barba wrapper
  const body = document.body;                                       // document body
  const WORD_LINK_SELECTOR = 'a[data-id]';                          // selector for word links

  // --- Language Switching Functions ---
  function initLanguageSwitcher() {
    if (!langToggle) return

    langToggle.addEventListener("click", toggleLanguage)

    // Set initial language from localStorage or default to English
    const savedLang = localStorage.getItem("wordplay-lang") || "en"
    if (savedLang === "he") {
      setLanguage("he", false) // false = don't save to localStorage again
    }
  }

  function toggleLanguage() {
    const newLang = currentLang === "en" ? "he" : "en"
    setLanguage(newLang, true)
  }

  function setLanguage(lang, save = true) {
    currentLang = lang

    // Update body class
    if (lang === "he") {
      body.classList.add("lang-he")
      document.documentElement.setAttribute("lang", "he")
      document.documentElement.setAttribute("dir", "rtl")
    } else {
      body.classList.remove("lang-he")
      document.documentElement.setAttribute("lang", "en")
      document.documentElement.setAttribute("dir", "ltr")
    }

    // Save preference
    if (save) {
      localStorage.setItem("wordplay-lang", lang)
    }

    // Trigger custom event for other components
    window.dispatchEvent(
      new CustomEvent("languageChanged", {
        detail: { language: lang },
      }),
    )
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
    if (!link) return;                 //
    e.preventDefault();               // stop full reload
    e.stopImmediatePropagation();    //

    const slug = link.dataset.id;
    if (slug === getPinnedSlug()) return;  // no-op if already pinned

    // disable further clicks immediately to prevent rapid transitions
    pileZone.removeEventListener("click", onPileClick);
    pileZone.style.pointerEvents = "none";
    body.classList.add("is-transitioning");

    barba.go(link.href);                   // START TRANSITION
  }

  // stop browser from reloading  
  function stopReload(targetLink) {
    const link = targetLink.target.closest(WORD_LINK_SELECTOR);
    if (!link) return;
    targetLink.preventDefault();
  }

  // reset click guard and cleanup
  function resetTransitionGuard() {
    body.classList.remove("is-transitioning"); // clear flag
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
      return { id: link.dataset.id, template: el.cloneNode(true) };
    });

  // list of valid slugs for quick lookup
  const allIds = fullWordList.map(item => item.id);

  // set initial header based on page
  const mainContainer = document.querySelector('[data-barba="container"]');
  const initialSlug = mainContainer.getAttribute("data-barba-namespace");
  updateWordplayZones(initialSlug);

  // rebuild header zones based on slug
  function updateWordplayZones(slug) { // rebuild header zones
    // Determine effective slug: exact match, parent for deep-link, or 404
    let effectiveSlug = slug;
    if (!allIds.includes(effectiveSlug)) {
      const parent = effectiveSlug.split("/")[0];
      if (allIds.includes(parent)) {
        effectiveSlug = parent; // use parent segment if valid
      } else {
        // 404 case: clear pinned, render full pile
        pinnedZone.innerHTML = ""; // no pin on 404
        pileZone.innerHTML = "";
        const frag404 = document.createDocumentFragment();
        fullWordList.forEach(({ template }) =>
          frag404.appendChild(template.cloneNode(true))
        );
        pileZone.appendChild(frag404);
        return; // skip normal logic
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

    workingList.forEach(({ id, template }) => {
      const clone = template.cloneNode(true);
      if (id === effectiveSlug) pinnedFrag.appendChild(clone);
      else pileFrag.appendChild(clone);
    });

    pinnedZone.innerHTML = "";
    pileZone.innerHTML = "";
    pinnedZone.appendChild(pinnedFrag);
    pileZone.appendChild(pileFrag);
  }

  // --- Event Listeners ---
  pileZone.addEventListener("click", onPileClick);
  pinnedZone.addEventListener("click", stopReload);
  placeZone.addEventListener("click", stopReload);

  // Initialize language switcher
  initLanguageSwitcher()

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
  })