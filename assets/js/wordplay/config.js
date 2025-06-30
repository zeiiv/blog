export const SELECTORS = {
  header: "#wordplay-header",
  pileZone: ".zone-pile",
  pinnedZone: ".zone-pinned",
  placeZone: ".zone-place",
  langToggle: "#lang-toggle",
  wrapper: "[data-barba='wrapper']",
  container: "[data-barba='container']",
  wordLink: "a[data-id]",
  wordItem: ".word-item"
};
export const CLASSNAMES = {
  transitioning: "is-transitioning"
};
/** Storage keys & language class names **/
export const STORAGE_KEYS = {
  pileOrder: 'place-pile-order',
  lang: 'place-lang'
};
export const LANG_CLASSES = {
  en: 'lang--en',
  he: 'lang--he'
};
/** Animation Configuration and Helpers **/
export const ANIM = {
  // Base transition duration (for page transitions)
  transitionDuration: 0.6, // 600ms - master timing for page transitions
  
  // All durations as percentages of transitionDuration
  durations: { 
    // Page transition timing
    transition: 2.0,        // 100% = 600ms (full page transition)
    header: 0.83,           // 83.3% = 500ms (header animation)
    fade: 0.42,             // 41.7% = 250ms
    
    // Word animation phases 
    animateToPinned: 1.0,   // 100% = 600ms (full U-shape: descend + slide + ascend)
    pinnedDescend: 0.2,     // 20% = 120ms (down movement)
    pinnedSlide: 0.6,       // 40% = 240ms (horizontal slide)  
    pinnedAscend: 0.2,      // 40% = 240ms (up movement)
    
    // Return movement
    animateToPile: 0.5,     // 50% = 300ms (straight movement back to pile)
    
    // Other animations
    hover: 0.5,             // 50% = 300ms
  },
  
  // Helper functions
  getDuration: (key) => {
    return ANIM.transitionDuration * ANIM.durations[key];
  },
  
  getDurationMs: (key) => {
    return ANIM.getDuration(key) * 1000;
  },
  
  eases: { 
    flat: "none",
    bounce: "bounce",
    smooth: "power1.inOut",
    easeOut: "power2.out"
  },
  values: { 
    hoverNudge: 3,       // px vertical nudge on pile hover
    dipFactor: 2,        // multiplier × word height for the dip
  }
};
export const BREAKPOINTS = {
  mobile: "(max-width: 600px)"
};
export const EVENTS = {
  PILE_SHRINK:  "pile-shrink-mobile",
  PILE_EXPAND:  "pile-expand-mobile",
  PLACE_CLICK:  "place-click-anim"
};