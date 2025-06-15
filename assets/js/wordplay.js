import gsap from "https://cdn.skypack.dev/gsap@3.12.5";
import { Flip } from "https://cdn.skypack.dev/gsap@3.12.5/Flip";
import barba from "https://cdn.skypack.dev/@barba/core@2.10.3";

gsap.registerPlugin(Flip);

document.addEventListener("DOMContentLoaded", () => {
  const HEADER_ANIM_DURATION = 1.5;
  const FADE_DURATION = HEADER_ANIM_DURATION / 2;

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
  
  // Update header zones based on namespace/slug
  function updateWordplayZones(slug) {
    pinnedZone.innerHTML = "";
    pileZone.innerHTML = "";
    let matched = false;
    fullWordList.forEach(clone => {
      const cloneSlug = clone.querySelector("a").dataset.id;
      if (cloneSlug === slug) {
        clone.classList.add("pinned-word");
        pinnedZone.appendChild(clone);
        matched = true;
      } else {
        clone.classList.remove("pinned-word");
        pileZone.appendChild(clone);
      }
    });
    if (!matched) {
      console.warn("[wordplay] No matching header item for namespace:", slug);
    }
  }

  barba.init({
    transitions: [{
      name: 'opacity-transition',
      from: { namespace: ["place", "place-of", "place-with", "placeless", "place-time"] },
      to:   { namespace: ["place", "place-of", "place-with", "placeless", "place-time"] },
      leave({ current }) {
        // fade out old container
        return gsap.to(current.container, { opacity: 0, duration: FADE_DURATION });
      },
      beforeEnter({ next }) {
        // hide the new container before fading in
        gsap.set(next.container, { opacity: 0 });
      },
      enter({ next }) {
        // fade in the new container
        return gsap.to(next.container, { opacity: 1, duration: FADE_DURATION });
      }
    }]
  });

  // After each page enter, update header based on namespace
  barba.hooks.afterEnter(({ next }) => {
    const slug = Array.isArray(next.namespace) ? next.namespace[0] : next.namespace;
    updateWordplayZones(slug);
  });
});