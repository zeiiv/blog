import gsap from "https://cdn.skypack.dev/gsap@3.12.5"; // GSAP core
import { Flip } from "https://cdn.skypack.dev/gsap@3.12.5/Flip"; // GSAP FLIP plugin
import barba from "https://cdn.skypack.dev/@barba/core@2.10.3"; // Barba.js page transitions
gsap.registerPlugin(Flip); // register FLIP

document.addEventListener("DOMContentLoaded", () => {
  let prevPinnedSlug = null;                             // previously pinned slug
  const HEADER_ANIM_DURATION = 1;                        // header FLIP duration (s)
  const FADE_DURATION = HEADER_ANIM_DURATION / 2;        // content fade duration (s)

  const header = document.getElementById("wordplay-header");      // header element
  const pileZone = header.querySelector(".zone-pile");            // pile container
  const pinnedZone = header.querySelector(".zone-pinned");        // pinned container
  header.classList.add("is-ready");                               // reveal header zones

  const wrapper = document.querySelector('[data-barba="wrapper"]'); // Barba wrapper
  const body = document.body;                                       // document body
  const WORD_LINK_SELECTOR = 'a[data-id]';                          // selector for word links

  // return the slug (data-id) of a .word-item or null
  function getSlugFromItem(itemEl) {
    if (!itemEl) return null;
    const link = itemEl.querySelector(WORD_LINK_SELECTOR); // find the <a>
    return link?.dataset.id || null;                       // return slug
  }

  // return the currently pinned slug
  function getPinnedSlug() {
    const pinnedItem = pinnedZone.querySelector(".word-item"); 
    return getSlugFromItem(pinnedItem);
  }

  // click handler for SPA navigation
  function onPileClick(e) {
    const link = e.target.closest(WORD_LINK_SELECTOR);
    if (!link) return;
    e.preventDefault();                // stop full reload
    e.stopImmediatePropagation();

    const slug = link.dataset.id;
    if (slug === getPinnedSlug()) return;  // no-op if same
   // prevPinnedSlug = getPinnedSlug();      
    barba.go(link.href);                   // start transition
  }
  
  // Prevent reload/flicker when clicking the already-pinned word
  function onPinnedClick(e) {
    const link = e.target.closest("a[data-id]");
    if (!link) return;
    e.preventDefault(); // stops the browser from reloading
  }
  
  function onPlaceClick(e) {
    
  }
  // reset click guard and cleanup
  function resetTransitionGuard() {
    body.classList.remove("is-transitioning"); // clear flag
    pileZone.style.pointerEvents = "";         // re-enable clicks
    pileZone.addEventListener("click", onPileClick); // reattach handler
  }

  // build list of {id, template} once
  const fullWordList = Array.from(pileZone.children)
    .concat(Array.from(pinnedZone.children))
    .map(el => {
      const link = el.querySelector(WORD_LINK_SELECTOR);
      return { id: link.dataset.id, template: el.cloneNode(true) };
    });

  pileZone.addEventListener("click", onPileClick); // attach click handler
  pinnedZone.addEventListener("click", onPinnedClick);
  

  // set initial header based on page
  const mainContainer = document.querySelector('[data-barba="container"]');
  const initialSlug = mainContainer.getAttribute("data-barba-namespace");
  updateWordplayZones(initialSlug);

  // rebuild header zones based on slug
  function updateWordplayZones(slug) { // rebuild header zones
    const workingList = fullWordList.slice(); // copy list so splice/unshift won't mutate original

    // move previous pinned item to front when returning home or changing pages
    if (prevPinnedSlug) {
      const idx = workingList.findIndex(item => item.id === prevPinnedSlug);
      if (idx > -1) workingList.unshift(workingList.splice(idx, 1)[0]);
    }

    // normal and home-case rendering: split pinned vs. pile
    const pinnedFrag = document.createDocumentFragment();
    const pileFrag   = document.createDocumentFragment();

    workingList.forEach(({ id, template }) => {
      const clone = template.cloneNode(true);
      if (id === slug) pinnedFrag.appendChild(clone);
      else pileFrag.appendChild(clone);
    });

    pinnedZone.innerHTML = "";
    pileZone.innerHTML   = "";
    pinnedZone.appendChild(pinnedFrag);
    pileZone.appendChild(pileFrag);
  }

  // initialize Barba transitions
  barba.init({
    transitions: [{
      name: "wordplay-fade",
      sync: false,

      // fade out old page and lock footer
      leave({ current }) {
        prevPinnedSlug = getPinnedSlug();                   // remember old pin
        pileZone.removeEventListener("click", onPileClick); // disable further clicks
        pileZone.style.pointerEvents = "none";              // block pointer events
        body.classList.add("is-transitioning");             // add transition flag
        wrapper.style.minHeight = `${current.container.offsetHeight}px`;
        return gsap.to(current.container, { autoAlpha: 0, duration: FADE_DURATION })
          .then(() => wrapper.style.minHeight = "");
      },

      // prepare incoming page
      beforeEnter({ next }) {
        const slug = Array.isArray(next.namespace) ? next.namespace[0] : next.namespace;
        if (slug !== getPinnedSlug()) updateWordplayZones(slug); // only update when needed
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

  barba.hooks.after(resetTransitionGuard); // fallback reset
});