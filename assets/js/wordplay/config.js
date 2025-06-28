export const SELECTORS = {
  header: "#wordplay-header",
  pileZone: ".zone-pile",
  pinnedZone: ".zone-pinned",
  placeZone: ".zone-place",
  langToggle: "#lang-toggle",
  wrapper: "[data-barba='wrapper']",
  container: "[data-barba='container']",
  wordLink: "a[data-id]"
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
  durations: { 
    fade: 0.5,
    header: 0.5,           
    hover: 0.3,
    clickRipple: 0.6
  },
  eases: { 
    flat: "none",
    bounce: "bounce"
  },
  values: { 
    hoverNudge: 3,       // px vertical nudge on pile hover
    dipFactor: 1,        // multiplier × word height for the dip
    swapSplit: [0.6, 0.4] // timeline split between Flip and dip‑rise
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