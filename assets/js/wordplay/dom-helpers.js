import gsap from "./vendor.js";
import { CLASSNAMES, SELECTORS, BREAKPOINTS } from "./config.js";

// Interaction blocking with inert for keyboard focus
export const blockInteractions = (els = []) => {
  document.documentElement.classList.add(CLASSNAMES.transitioning);
  els.forEach(el => {
    if (el && el.nodeType === Node.ELEMENT_NODE) {
      el.style.pointerEvents = 'none';
      el.setAttribute('inert', '');
    }
  });
};

export const unblockInteractions = (els = []) => {
  document.documentElement.classList.remove(CLASSNAMES.transitioning);
  els.forEach(el => {
    if (el && el.nodeType === Node.ELEMENT_NODE) {
      el.style.pointerEvents = '';
      el.removeAttribute('inert');
    }
  });
};

// safeUnblock removed - timelines now handle their own cleanup

// Normalize Barba namespace to slug
export const normalizeSlug = (ns) => {
    return Array.isArray(ns) ? ns[0] : ns;
};
// LocalStorage utilities for JSON arrays
export const saveOrder = (key, arr) => {
    try { localStorage.setItem(key, JSON.stringify(arr)); } catch { }
};
export const loadOrder = (key) => {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
};

// --- Lightweight hover effects using quickTo + overwrite:auto ---
export const getQuickTween = (el, prop, opts) => {
    const key = `_quick_${prop}`;
    if (!el[key]) {
        if (prop === "scale") {
            // create paired setters for scaleX and scaleY to avoid GSAP's
            // "scale not eligible for reset" warning
            const qx = gsap.quickTo(el, "scaleX", { ...opts, lazy: false });
            const qy = gsap.quickTo(el, "scaleY", { ...opts, lazy: false });
            el[key] = value => { qx(value); qy(value); };
        } else {
            el[key] = gsap.quickTo(el, prop, { ...opts, lazy: false });
        }
    }
    return el[key];
};

// Clean up cached quickTo functions from DOM elements
export const clearQuickTweens = (elements) => {
    elements.forEach(el => {
        if (!el) return;
        // Remove all cached _quick_ properties
        Object.getOwnPropertyNames(el).forEach(prop => {
            if (prop.startsWith('_quick_')) {
                delete el[prop];
            }
        });
    });
};

// Utility: get slug from a word-item element and return the pinned slug
export const getCurrentPinnedSlug = () => {
  const pinnedItem = document.querySelector(SELECTORS.wordItem);
  const link = pinnedItem?.querySelector(SELECTORS.wordLink);
  return link?.dataset.id || null;
};


// --- Shared state for prevPinnedSlug ---
let lastPinnedSlug = null;
export const getLastPinnedSlug = () => lastPinnedSlug;
export const setLastPinnedSlug = (slug) => { lastPinnedSlug = slug; };

/**
 * Runs the given setup function while the mobile media query matches.
 * Automatically unbinds it when the condition no longer applies.
 * param {Function} fn – should return a cleanup function
 */
export const withMobileContext = (fn) => {
  const mm = gsap.matchMedia();
  return mm.add(BREAKPOINTS.mobile, fn);
};
// Utility: true when the mobile query is live
export const isMobile = () => window.matchMedia(BREAKPOINTS.mobile).matches;

