import { barba } from "./vendor.js";
import { SELECTORS, ANIM } from "./config.js";
import { normalizeSlug, unblockInteractions, getCurrentPinnedSlug, setLastPinnedSlug } from "./dom-helpers.js";
import { animateLeavePage, animateEnterPage } from "./animations.js";
import { animManager } from "./anim-manager.js";

export const initPageTransitions = ({ renderHeader, getCurrentLang }) => {

    const wrapper = document.querySelector(SELECTORS.wrapper);

    let currentLang = getCurrentLang();

    // reset click guard and cleanup
    const resetTransitionGuard = () => {
        // clear transition guard and re-enable interactions
        unblockInteractions([]);
        document.dispatchEvent(new CustomEvent("wordplay:restorePileClick"));
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
                try {
                    // Don't kill animations if they're header transitions - let them complete
                    console.log('[transitions] Leave hook called, preserving header animations');
                    
                    // But clean up any stuck elements as a safety measure
                    const allWordItems = document.querySelectorAll('.word-item');
                    allWordItems.forEach(item => {
                        // Clear any stuck transforms without interrupting ongoing animations
                        const transform = window.getComputedStyle(item).transform;
                        if (transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)') {
                            console.log('[transitions] Found potentially stuck element, will monitor:', item.querySelector('a')?.dataset.id);
                        }
                    });
                    
                    setLastPinnedSlug(getCurrentPinnedSlug());
                    currentLang = getCurrentLang(); // Update current language

                    if (wrapper && current.container) {
                        wrapper.style.minHeight = `${current.container.offsetHeight}px`;
                    }

                    // Listen for window resize to maintain wrapper height
                    window.addEventListener('resize', onResize);

                    // Determine slide direction based on language
                    return animateLeavePage(current.container)
                        .then(() => {
                            if (wrapper) wrapper.style.minHeight = "";
                        })
                        .catch(err => {
                            console.error("[wordplay] leave animation error:", err);
                            if (wrapper) wrapper.style.minHeight = "";
                        })
                        .finally(() => {
                            window.removeEventListener('resize', onResize);
                        });
                } catch (error) {
                    console.error("[wordplay] leave error:", error);
                    return Promise.resolve();
                }
            },

            beforeEnter({ next }) {
                try {
                    window.scrollTo(0, 0);
                    
                    // Clear any stale navigation flags on page load
                    sessionStorage.removeItem('_navigationInProgress');
                    sessionStorage.removeItem('_navigationTimestamp');
                    
                    // Reset header positioning after page transition
                    const headerElement = document.querySelector('#wordplay-header');
                    if (headerElement) {
                        headerElement.style.position = '';
                        headerElement.style.top = '';
                        headerElement.style.left = '';
                        headerElement.style.right = '';
                        headerElement.style.zIndex = '';
                        headerElement.style.background = '';
                        console.log('[transitions] Header positioning reset after page transition');
                    }
                    
                    const slug = normalizeSlug(next.namespace);
                    
                    // Check if there are ongoing animations that might conflict
                    if (animManager.timelines.length > 0) {
                        console.log('[transitions] Skipping renderHeader - animations in progress:', animManager.timelines.length);
                        // Don't call renderHeader during active animations to prevent glitches
                    } else {
                        console.log('[transitions] Safe to render header - no active animations');
                        renderHeader(slug, false);
                    }
                    
                    currentLang = getCurrentLang(); // Update language state
                } catch (error) {
                    console.error("[wordplay] beforeEnter error:", error);
                }
            },

            // fade in new page
            enter({ next }) {
                return new Promise((resolve, reject) => {
                    try {
                        if (!next.container) {
                            resolve();
                            return;
                        }
                        animateEnterPage(
                            next.container,
                            () => {
                                // Wait for complete transition, then resolve
                                setTimeout(() => {
                                    resetTransitionGuard();
                                    resolve();
                                }, ANIM.getDurationMs('transition'));
                            },
                            () => {
                                resetTransitionGuard();
                                resolve();
                            }
                        );
                    } catch (error) {
                        console.error("[wordplay] enter error:", error);
                        resetTransitionGuard();
                        reject(error);
                    }
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
            renderHeader(slug, false)
        }
        resetTransitionGuard()
    });

};