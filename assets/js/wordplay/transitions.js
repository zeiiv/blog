import gsap from "./vendor/gsap.js";
import { Flip } from "./vendor/gsap.js";
import barba from "./vendor/barba.js";
import { SELECTORS, BREAKPOINTS, ANIM, EVENTS } from "./config.js";
import { normalizeSlug, unblockInteractions } from "./dom-helpers.js";
import { animManager } from "./anim-manager.js";
import { onPileClick, getPrevPinnedSlug, getPinnedSlug } from "./header-render.js";

export default function initTransitions({ renderHeader, getCurrentLang }) {

    const wrapper = document.querySelector(SELECTORS.wrapper);
    const pileZone = document.querySelector(SELECTORS.pileZone);

    // reset click guard and cleanup
    const resetTransitionGuard = () => {
        // clear transition guard and re-enable interactions
        unblockInteractions();
        pileZone.addEventListener("click", onPileClick);
    };

    // Adjust wrapper height on window resize during transition
    const onResize = () => {
        const currentContainer = document.querySelector(SELECTORS.container);
        if (currentContainer) {
            wrapper.style.minHeight = `${currentContainer.offsetHeight}px`;
        }
    };

    barba.init({
        transitions: [{
            name: "wordplay-fade",
            sync: false,
            // fade out old page and lock footer
            leave({ current }) {
                prevPinnedSlug = getPinnedSlug();                   // remember old pin
                wrapper.style.minHeight = `${current.container.offsetHeight}px`;
                // Listen for window resize to maintain wrapper height
                window.addEventListener('resize', onResize);
                // Determine slide direction based on language: en → right, he → left
                const dir = getDirOffset(currentLang);
                // Capture header state for FLIP if needed (before fade)
                // const flipState = Flip.getState([...placeZone.children, ...pinnedZone.children, ...pileZone.children]);
                return gsap.timeline()
                    .to(current.container, {
                        autoAlpha: 0,
                        x: dir,
                        duration: FADE_DURATION,
                        ease: 'power1.inOut'
                    }, 0)
                    .then(() => {
                        wrapper.style.minHeight = "";  // clear height lock
                    })
                    .catch(err => {
                        console.error("[wordplay] leave animation error:", err);
                    })
                    .finally(() => {
                        // Always remove resize listener to prevent memory leaks
                        window.removeEventListener('resize', onResize);
                    });
            },

            beforeEnter({ next }) { // prepare incoming page
                window.scrollTo(0, 0);
                const slug = normalizeSlug(next.namespace); // normalize slug
                renderHeader(slug); // always sync header based on slug
                // Determine slide direction for incoming content (reverse of leave)
                const dir = getDirOffset(currentLang);
                gsap.set(next.container, { autoAlpha: 0, x: dir, visibility: "visible" });
            },

            // fade in new page
            enter({ next }) {
                // Slide- and fade-in incoming content
                const dir = getDirOffset(currentLang);
                return new Promise(resolve => {
                    // Start fade-in of new page content
                    gsap.to(next.container, {
                        autoAlpha: 1,
                        x: 0,
                        duration: FADE_DURATION,
                        ease: 'power1.inOut'
                    });
                    // Wait for both header flip and content transition to finish before re-enabling interactions
                    gsap.delayedCall(HEADER_ANIM_DURATION, () => {
                        resetTransitionGuard();
                        resolve();
                    });
                });
            },
        }],
    });

    // Fallback for history navigation: only re-sync header on popstate
    // Checks for 
    barba.hooks.after(({ next, trigger }) => {
        if (trigger === "popstate") {
            // normalize namespace to slug
            const slug = normalizeSlug(next.namespace);
            renderHeader(slug)
        }
        resetTransitionGuard()
    });

};