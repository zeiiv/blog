import gsap from "./vendor/gsap.js";
import barba from "./vendor/barba.js";

import { SELECTORS                            } from "./config.js";
import { initHeaderInteractions, renderHeader } from "./header-render.js";
import { initLanguageSwitcher, getCurrentLang } from "./language.js";
import { initTransitions                      } from "./transitions.js";

document.addEventListener("DOMContentLoaded", () => {
  // 1) initial render
  const mainContainer = document.querySelector(SELECTORS.container);
  const initialSlug   = mainContainer.dataset.barbaNamespace;
  renderHeader(initialSlug);

  // 2) un-hide the header
  gsap.set(
    [
      document.querySelector(SELECTORS.header),
      document.querySelector(SELECTORS.pileZone),
      document.querySelector(SELECTORS.pinnedZone)
    ],
    { autoAlpha: 1 }
  );

  // 3) wire everything up
  initHeaderInteractions(renderHeader);
  initLanguageSwitcher  (renderHeader);
  initTransitions     ({ renderHeader, getCurrentLang });
});