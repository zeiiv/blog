// Import GSAP core for animations
import gsap from "https://cdn.skypack.dev/gsap@3.12.5";
// Import GSAP Flip plugin for FLIP animations
import { Flip } from "https://cdn.skypack.dev/gsap@3.12.5/Flip";
// Import Barba.js for page transitions
import barba from "https://cdn.skypack.dev/@barba/core@2.10.3";

// Register the Flip plugin with GSAP
gsap.registerPlugin(Flip);

// Wait for the DOM to be fully loaded before initializing
document.addEventListener("DOMContentLoaded", () => {

  // Track the slug of the previously pinned word
  let prevPinnedSlug = null;
  // Duration for header Flip animation (in seconds)
  const HEADER_ANIM_DURATION = 1;
  // Duration for content fade animations
  const FADE_DURATION = 0.5;
  // Cache header element and its wordplay zones
  const header = document.getElementById("wordplay-header");
  const pileZone = header.querySelector(".zone-pile");
  const pinnedZone = header.querySelector(".zone-pinned");
  // Mark header ready to show zones (hides initial flicker)
  header.classList.add('is-ready');
  // Cache the Barba wrapper to avoid repeated queries
  const wrapper = document.querySelector('[data-barba="wrapper"]');
  //
  const mainContainer = document.querySelector('[data-barba="container"]');
  const initialSlug = mainContainer.getAttribute('data-barba-namespace');
  // Cache body for transition callbacks
  const body = document.body;
  // 
  const WORD_LINK_SELECTOR = 'a[data-id]';

  // Helper to get the slug of the currently pinned word-item
  function getSlugFromItem(itemEl) {
    // Given a `.word-item` container (or null), find its <a> and return the data-id
    if (!itemEl) return null;
    const link = itemEl.querySelector(WORD_LINK_SELECTOR);
    return link?.dataset.id || null;
  }
  function getPinnedSlug() {
    const pinnedItem = pinnedZone.querySelector('.word-item');
    return getSlugFromItem(pinnedItem) || null;
  }

  // Click handler for SPA navigation
  function onPileClick(e) {
    const link = e.target.closest('a[data-id]');
    if (!link) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    prevPinnedSlug = getPinnedSlug();
    barba.go(link.getAttribute('href'));
    // Temporarily disable listener to prevent overlaps
    pileZone.removeEventListener('click', onPileClick);
    // Also disable pointer events to block clicks during transition
    pileZone.style.pointerEvents = 'none';
    body.classList.add('is-transitioning');
  }
  function resetTransitionGuard() {
    body.classList.remove('is-transitioning');
    // Re-enable pointer events for navigation
    pileZone.style.pointerEvents = '';
    // Re-attach handler only if it’s gone
    if (!pileZone.onclick) pileZone.addEventListener('click', onPileClick);
  }
  // Clone initial header items so we can rebuild zones on navigation
  const fullWordList = Array.from(pileZone.children).concat(
    Array.from(pinnedZone.children)
  ).map(el => {
    const link = el.querySelector(WORD_LINK_SELECTOR);
    const id = link.dataset.id;
    return { id, template: el.cloneNode(true) };
  });

  // Attach named handler
  pileZone.addEventListener('click', onPileClick);
  // On initial load, set header zones according to current page namespace
  updateWordplayZones(initialSlug);
  // Rebuild the header zones based on the current page slug
  function updateWordplayZones(slug) {
    // Use the main list directly since we do not need to preserve original order
    const workingList = fullWordList;

    // If there was a previous pin, move it to front:
    if (prevPinnedSlug && prevPinnedSlug !== slug) {
      // Find the original index of the previous pin
      const idx = fullWordList.findIndex(item => item.id === prevPinnedSlug);
      if (idx > -1) {
        // Splice out that element and unshift it:
        const [prevClone] = workingList.splice(idx, 1);
        workingList.unshift(prevClone);
      }
    }
    const pileFrag   = document.createDocumentFragment();
    const pinnedFrag = document.createDocumentFragment();
    // Then rebuild pinned vs. pile as before...
    workingList.forEach(({ id, template }) => {
      const clone = template.cloneNode(true);
      if (id === slug) pinnedFrag.appendChild(clone);
      else pileFrag.appendChild(clone);
    });
    // Clear zones
    pinnedZone.innerHTML = '';
    pileZone.innerHTML = '';
    pinnedZone.appendChild(pinnedFrag);
    pileZone.appendChild(pileFrag);
  }

  // Initialize Barba page transition logic
  barba.init({
    transitions: [{
      name: 'wordplay-fade',
      sync: false,
      // Leave hook: fade out old content and preserve layout to prevent footer jump
      leave({ current }) {
        // Preserve wrapper height to prevent footer jump
        wrapper.style.minHeight = `${current.container.offsetHeight}px`;
        // Add transition class to body to overlay containers
        body.classList.add('is-transitioning');
        return gsap.to(current.container, { autoAlpha: 0, duration: FADE_DURATION })
          .then(() => {
            // Clear the wrapper min-height after fade-out completes
            wrapper.style.minHeight = '';
          });
      },
      // Before Enter hook: prepare new content container for fade-in
      beforeEnter({ next }) {
        // Immediately update header zones for incoming page to avoid flicker
        const slug = Array.isArray(next.namespace)
          ? next.namespace[0]
          : next.namespace;
        updateWordplayZones(slug);
        gsap.set(next.container, { autoAlpha: 0, visibility: 'visible' });
      },
      // Enter hook: fade in new content (header zones already updated in beforeEnter)
      enter({ next }) {
        // Fade in then Reset Transition flag
        return gsap.to(next.container, { autoAlpha: 1, duration: FADE_DURATION })
          .then(() => {
            resetTransitionGuard();
          })
          .catch(err => {
            console.error('[wordplay] Transition enter error:', err);
            resetTransitionGuard();
          });
      },
    }]
  });
  // Fallback hook to reset guard if needed after any transition
  barba.hooks.after(resetTransitionGuard);
});
