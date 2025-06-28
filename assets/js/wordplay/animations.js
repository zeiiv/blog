import gsap from "./vendor/gsap.js";
import { Flip } from "./vendor/gsap.js";
import { EVENTS, ANIM } from "./config.js";

/**
 * Runs the “dip → flip → rise” swap animation.
 * @param {GSAPFlipState} state  – Flip.getState([...])
 * @param {HTMLElement} newEl     – the newly pinned element
 * @param {Array} blockEls        – elements to block/unblock
 * @param {Function} isMobile     – returns true on narrow viewports
 * @returns {GSAPTimeline}        – the flippable timeline
 */
export function animateSwap(state, newEl, blockEls, isMobile) {
  const clickDur = ANIM.durations.clickRipple;
  const dropDist = newEl.offsetHeight * ANIM.values.dipFactor;

  // Block & flip
  blockEls.forEach(el => el.setAttribute("inert",""));  
  const tl = Flip.from(state, {
    duration: clickDur * ANIM.values.swapSplit[0],
    ease: "power1.inOut",
    absolute: true,
    onComplete() {
      gsap.fromTo(newEl,
        { y: dropDist },
        {
          y: 0,
          duration: clickDur * ANIM.values.swapSplit[1],
          ease: ANIM.eases.bounce,
          onComplete() {
            if (isMobile()) document.querySelector(".zone-pile")
                              .dispatchEvent(new Event(EVENTS.PILE_EXPAND));
          }
        }
      );
    }
  });

  return tl;
}

/**
 * Animates the “place-click” FLIP (no dip/rise)
 * @param {HTMLElement[]} children – the pile children
 * @returns {GSAPTimeline}
 */
export function animatePlaceFlip(children) {
  const state = Flip.getState(children);
  return Flip.from(state, { duration: ANIM.durations.header, ease: ANIM.eases.flat });
}

/**
 * Fade-and-slide container for Barba transitions.
 * @param {HTMLElement} container
 * @param {number} dir             – x-offset
 * @param {boolean} isLeave
 * @returns {Promise}
 */
export function animatePage(container, dir, isLeave = true) {
  const dur = ANIM.durations.fade;
  if (isLeave) {
    return gsap.to(container, {
      autoAlpha: 0, x: dir, duration: dur, ease: "power1.inOut"
    }).then(() => {});
  } else {
    gsap.set(container, { autoAlpha: 0, x: dir, visibility: "visible" });
    return gsap.to(container, {
      autoAlpha: 1, x: 0, duration: dur, ease: "power1.inOut"
    });
  }
}

