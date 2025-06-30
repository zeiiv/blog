import { barba } from "./vendor.js";
import { SELECTORS, ANIM } from "./config.js";
import { normalizeSlug, unblockInteractions, getCurrentPinnedSlug, setLastPinnedSlug } from "./dom-helpers.js";
import { animateLeavePage, animateEnterPage } from "./animations.js";
import { animManager } from "./anim-manager.js";

export const initPageTransitions = ({ renderHeader, getCurrentLang }) => {

    const wrapper = document.querySelector(SELECTORS.wrapper);

    // Track current language for state management
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

    // Initialize DOM animation state tracking
    if (!document.documentElement.hasAttribute('data-header-animating')) {
        console.log('[transitions] DOM animation state initialized');
    }

    barba.init({
        transitions: [{
            name: "wordplay-fade",
            sync: false,
            // fade out old page and lock footer
            leave({ current }) {
                try {
                    // Check for ongoing header animation for coordination
                    const hasOngoingHeaderAnimation = document.documentElement.hasAttribute('data-header-animating');
                    const hasAnimatingClass = document.querySelector('#wordplay-header')?.classList.contains('wordplay-animating');
                    console.log('[transitions] Leave hook called, coordinating with header animation:', {
                        hasOngoingHeaderAnimation,
                        hasAnimatingClass,
                        shouldCoordinate: hasOngoingHeaderAnimation || hasAnimatingClass
                    });
                    
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

                    // Faster transition when coordinating with header animation
                    const shouldCoordinate = hasOngoingHeaderAnimation || hasAnimatingClass;
                    if (shouldCoordinate) {
                        console.log('[transitions] Fast transition for header coordination');
                        return animateLeavePage(current.container, 0.2) // Faster duration
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
                    } else {
                        // Normal transition speed
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
                    }
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
                    sessionStorage.removeItem('wordplay-navigating');
                    
                    const slug = normalizeSlug(next.namespace);
                    const headerElement = document.querySelector('#wordplay-header');
                    
                    // Enhanced check - look for any signs of ongoing header animations
                    const hasOngoingHeaderAnimation = headerElement && headerElement.classList.contains('wordplay-animating');
                    const hasAnimationState = document.documentElement.hasAttribute('data-header-animating');
                    const hasRecentNavigation = sessionStorage.getItem('wordplay-navigating') && 
                                              (Date.now() - parseInt(sessionStorage.getItem('wordplay-navigating'))) < 1000;
                    
                    const shouldSkipRender = hasOngoingHeaderAnimation || hasAnimationState || hasRecentNavigation;
                    
                    console.log('[transitions] Animation detection:', {
                        hasHeaderElement: !!headerElement,
                        hasAnimatingClass: headerElement?.classList.contains('wordplay-animating'),
                        hasOngoingHeaderAnimation,
                        hasAnimationState,
                        hasRecentNavigation,
                        shouldSkipRender
                    });
                    if (!shouldSkipRender) {
                        console.log('[transitions] Rendering header for new page');
                        renderHeader(slug, false);
                    } else {
                        console.log('[transitions] Skipping renderHeader - animation in progress, no delayed call needed');
                        // Don't set up delayed call - the ongoing animation will handle header state
                        // and the new page initialization will handle final state if needed
                    }
                    
                    currentLang = getCurrentLang(); // Update language state
                    
                    // Fix bilingual content display after barba navigation
                    const contentContainer = next.container;
                    if (contentContainer) {
                        // Ensure proper language class is applied to content
                        const currentLang = getCurrentLang();
                        console.log('[transitions] Ensuring content language consistency:', currentLang);
                        
                        // Force content language state
                        document.documentElement.classList.remove('lang--he', 'lang--en');
                        document.documentElement.classList.add('lang--' + currentLang);
                        document.documentElement.setAttribute('lang', currentLang);
                        document.documentElement.setAttribute('dir', currentLang === 'he' ? 'rtl' : 'ltr');
                    }
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
                        
                        // Check for ongoing header animation for coordination
                        const hasOngoingHeaderAnimation = document.documentElement.hasAttribute('data-header-animating');
                        console.log('[transitions] Enter hook coordinating with header animation:', hasOngoingHeaderAnimation);
                        
                        if (hasOngoingHeaderAnimation) {
                            // Faster enter animation for coordination
                            console.log('[transitions] Fast enter animation for header coordination');
                            animateEnterPage(
                                next.container,
                                () => {
                                    // Shorter wait for coordinated transitions
                                    setTimeout(() => {
                                        resetTransitionGuard();
                                        resolve();
                                    }, ANIM.getDurationMs('transition') * 0.5); // 50% faster
                                },
                                () => {
                                    resetTransitionGuard();
                                    resolve();
                                },
                                0.2 // Faster duration
                            );
                        } else {
                            // Normal enter animation
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
                        }
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