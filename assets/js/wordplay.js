import gsap from "https://cdn.skypack.dev/gsap@3.12.5";
import { Flip } from "https://cdn.skypack.dev/gsap@3.12.5/Flip";
import barba from "https://cdn.skypack.dev/@barba/core@2.10.3";

gsap.registerPlugin(Flip);

document.addEventListener("DOMContentLoaded", () => {
  const HEADER_ANIM_DURATION = 1.5;
  const FADE_DURATION = HEADER_ANIM_DURATION / 2;

  // Prevent multiple transitions from overlapping
  let isTransitioning = false;

  // Header zones and item clones for FLIP transitions
  const header = document.getElementById("wordplay-header");
  const pileZone = header.querySelector(".zone-pile");
  const pinnedZone = header.querySelector(".zone-pinned");
  // Clone initial items for reuse
  const initialItems = [
    ...Array.from(pileZone.children),
    ...Array.from(pinnedZone.children)
  ];
  const fullWordList = initialItems.map(el => el.cloneNode(true));

  // SPA navigation via word-item clicks
  pileZone.addEventListener('click', e => {
    if (isTransitioning) return;
    const link = e.target.closest('a[data-id]');
    if (!link) return;
    e.preventDefault();
    isTransitioning = true;
    e.stopImmediatePropagation();
    const href = link.getAttribute('href');
    barba.go(href);
    // Disable further clicks until transition ends
    pileZone.style.pointerEvents = 'none';
  });

  // Function to repopulate header zones based on page slug
  function updateWordplayZones(slug) {
    pinnedZone.innerHTML = '';
    pileZone.innerHTML = '';
    fullWordList.forEach(el => {
      const id = el.querySelector('a').dataset.id;
      const clone = el.cloneNode(true);
      if (id === slug) {
        pinnedZone.appendChild(clone);
      } else {
        pileZone.appendChild(clone);
      }
    });
  }

  barba.init({
    transitions: [{
      name: 'wordplay-fade',
      sync: false,
      leave({ current }) {
        // Add transition class to body to overlay containers
        document.body.classList.add('is-transitioning');
        return gsap.to(current.container, { autoAlpha: 0, duration: FADE_DURATION });
      },
      beforeEnter({ next }) {
        gsap.set(next.container, { autoAlpha: 0, visibility: 'visible' });
      },
      enter({ next }) {
        const slug = Array.isArray(next.namespace)
          ? next.namespace[0]
          : next.namespace;
        updateWordplayZones(slug);
        return gsap.to(next.container, { autoAlpha: 1, duration: FADE_DURATION, clearProps: 'all' })
          .then(() => {
            // Remove transition class to restore normal flow
            document.body.classList.remove('is-transitioning');
            isTransitioning = false;
          });
      },
    }]
  });

  // Re-enable navigation after transition completes
  barba.hooks.afterEnter(() => {
    document.body.classList.remove('is-transitioning');
    isTransitioning = false;
    pileZone.style.pointerEvents = '';
  });
  // Also guard against cases where leave fails or is skipped
  barba.hooks.after(() => {
    isTransitioning = false;
    pileZone.style.pointerEvents = '';
  });
});