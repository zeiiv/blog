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
const transitionDuration = 0.6; // 600ms - master timing for page transitions

export const ANIM = {
  transitionDuration,
  
  // All durations computed from transitionDuration (in seconds)
  durations: {
    // Page transition timing
    transition: transitionDuration * 2.0,    // 1.2s (full page transition)
    header: transitionDuration * 0.80,       // 0.48s (header animation)
    fade: transitionDuration * 0.20,         // 0.12s (fade animation)
    
    // Word animation phases 
    animateToPinned: transitionDuration * 1.0,  // 0.6s (full U-shape: descend + slide + ascend)
    pinnedDescend: transitionDuration * 0.2,    // 0.12s (down movement)
    pinnedSlide: transitionDuration * 0.6,      // 0.36s (horizontal slide)  
    pinnedAscend: transitionDuration * 0.2,     // 0.12s (up movement)
    
    // Return movement
    animateToPile: transitionDuration * 0.5,    // 0.3s (straight movement back to pile)
    
    // Other animations
    hover: 2,            // 0.3s (hover effects)
  },
  
  // Helper functions
  getDuration: (key) => {
    return ANIM.durations[key]; // Already computed in seconds
  },
  
  getDurationMs: (key) => {
    return ANIM.durations[key] * 1000; // Convert to milliseconds
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
  },
  
  // Note: Most complex timing logic removed - global coordinator handles coordination now
};
export const BREAKPOINTS = {
  mobile: "(max-width: 600px)"
};
export const EVENTS = {
  PILE_SHRINK:  "pile-shrink-mobile",
  PILE_EXPAND:  "pile-expand-mobile",
  PLACE_CLICK:  "place-click-anim"
};