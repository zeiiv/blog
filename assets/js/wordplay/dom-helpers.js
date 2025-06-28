import gsap from "./vendor/gsap.js";
import { CLASSNAMES } from "./config.js";

// Interaction blocking with inert for keyboard focus
export const blockInteractions = els => {
  document.documentElement.classList.add(CLASSNAMES.transitioning);
  els.forEach(el => el && (el.style.pointerEvents = 'none', el.setAttribute('inert','')));
};

export const unblockInteractions = els => {
  document.documentElement.classList.remove(CLASSNAMES.transitioning);
  els.forEach(el => el && (el.style.pointerEvents = '', el.removeAttribute('inert')));
};

/**
 * Ensures interactions on the provided elements are re-enabled after a timeline.
 * @param {GSAPTween|Timeline} tl - the animation to watch
 * @param {HTMLElement[]} els - list of elements to unblock
 * @param {number} [fallback=1500] - ms before forcing unblock
 */
export const safeUnblock = (tl, els, fallback = 1500) => {
  // on normal completion or interruption, remove inert and pointer-block
  tl.eventCallback("onComplete", () => unblockInteractions(els));
  tl.eventCallback("onInterrupt", () => unblockInteractions(els));
  // fallback to ensure we unblock even if callbacks never fire
  setTimeout(() => unblockInteractions(els), fallback);
};

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