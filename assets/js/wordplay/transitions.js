import { barba } from "./vendor.js";
import { SELECTORS, ANIM } from "./config.js";
import { normalizeSlug, unblockInteractions, getCurrentPinnedSlug, setLastPinnedSlug } from "./dom-helpers.js";
import { animateLeavePage, animateEnterPage } from "./animations.js";
import { animManager } from "./anim-manager.js";
import { animationCoordinator } from "./coordinator.js";

export const initPageTransitions = ({ renderHeader, getCurrentLang }) => {

    const wrapper = document.querySelector(SELECTORS.wrapper);
    
    // Reinitialize wordplay system after page transitions
    const reinitializeWordplay = () => {
        try {
            // Get new page container and slug from the NEW page content
            const mainContainer = document.querySelector(SELECTORS.container);
            const rawSlug = normalizeSlug(mainContainer?.dataset.barbaNamespace) || 'place';
            
            // For homepage navigation, always use 'place' regardless of stale DOM data
            const currentPath = window.location.pathname;
            const slug = (currentPath === '/' || currentPath === '') ? 'place' : rawSlug;
            
            console.log('[transitions] Reinitializing wordplay:', {
                currentPath,
                rawSlug,
                finalSlug: slug,
                wasHomepageNavigation: currentPath === '/' || currentPath === ''
            });
            
            // Only reinitialize if coordination isn't managing the header state or recently completed
            if (animationCoordinator.isCoordinating() || animationCoordinator.recentlyCompletedCoordination()) {
                console.log('[transitions] Skipping reinitialization - coordination managing header state or recently completed');
                // Coordination is handling header state, don't interfere
                return;
            }
            
            // Normal reinitialization for non-coordinated transitions
            renderHeader(slug, false); // Don't animate on reinitialization
            console.log('[transitions] Header reinitialized for new page');
            
        } catch (error) {
            console.error('[transitions] Wordplay reinitialization error:', error);
        }
    };

    // Track current language for state management
    let currentLang = getCurrentLang();

    // Helper function to perform leave transition
    const performLeaveTransition = (current, shouldCoordinate) => {
        // Note: Transform cleanup handled by animManager.cleanupTransforms()
        
        setLastPinnedSlug(getCurrentPinnedSlug());
        currentLang = getCurrentLang(); // Update current language

        if (wrapper && current.container) {
            wrapper.style.minHeight = `${current.container.offsetHeight}px`;
        }

        // Listen for window resize to maintain wrapper height
        window.addEventListener('resize', onResize);

        // Faster transition when coordinating with header animation
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
    };

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
        // Add global hooks for pointer-events blocking (industry standard)
        beforeEnter() {
            console.log('[transitions] Blocking interactions - adding is-transitioning class');
            document.documentElement.classList.add('is-transitioning');
        },
        
        after() {
            console.log('[transitions] Restoring interactions - removing is-transitioning class');
            document.documentElement.classList.remove('is-transitioning');
        },
        
        views: [{
            namespace: 'place',
            afterEnter() {
                console.log('[transitions] Checking if reinitializing wordplay needed for place page');
                // Only reinitialize if coordination isn't managing header state or recently completed
                if (!animationCoordinator.isCoordinating() && !animationCoordinator.recentlyCompletedCoordination()) {
                    console.log('[transitions] Reinitializing wordplay for place page');
                    reinitializeWordplay();
                } else {
                    console.log('[transitions] Skipping reinitialize - coordination managing header state or recently completed');
                }
            }
        }, {
            namespace: 'post',  
            afterEnter() {
                console.log('[transitions] Checking if reinitializing wordplay needed for post page');
                // Only reinitialize if coordination isn't managing header state or recently completed
                if (!animationCoordinator.isCoordinating() && !animationCoordinator.recentlyCompletedCoordination()) {
                    console.log('[transitions] Reinitializing wordplay for post page');
                    reinitializeWordplay();
                } else {
                    console.log('[transitions] Skipping reinitialize - coordination managing header state or recently completed');
                }
            }
        }],
        transitions: [{
            name: "wordplay-fade",
            sync: false,
            // fade out old page and lock footer
            leave({ current }) {
                return new Promise((resolve) => {
                    try {
                        // Check if coordinator is managing a transition
                        const isCoordinating = animationCoordinator.isCoordinating();
                        
                        console.log('[transitions] Leave hook - coordination check:', {
                            isCoordinating,
                            currentPhase: animationCoordinator.getCurrentPhase(),
                            coordinationId: animationCoordinator.getCurrentCoordinationId(),
                            progress: animationCoordinator.getCurrentProgress()
                        });
                        
                        if (isCoordinating) {
                            console.log('[transitions] Coordinated leave - waiting for optimal timing');
                            // Wait for coordination to reach appropriate phase
                            const waitForOptimalTiming = () => {
                                const phase = animationCoordinator.getCurrentPhase();
                                if (phase === 'coordinating' || phase === 'complete') {
                                    console.log('[transitions] Optimal timing reached, starting leave animation');
                                    performLeaveTransition(current, true).then(resolve);
                                } else {
                                    setTimeout(waitForOptimalTiming, 30);
                                }
                            };
                            waitForOptimalTiming();
                        } else {
                            // No coordination, proceed normally
                            console.log('[transitions] Normal leave transition');
                            performLeaveTransition(current, false).then(resolve);
                        }
                    } catch (error) {
                        console.error("[transitions] leave error:", error);
                        resolve();
                    }
                });
            },

            beforeEnter({ next }) {
                try {
                    window.scrollTo(0, 0);
                    
                    const slug = normalizeSlug(next.namespace);
                    
                    // Check if coordinator is managing header state
                    const isCoordinating = animationCoordinator.isCoordinating();
                    
                    console.log('[transitions] beforeEnter - coordination check:', {
                        isCoordinating,
                        currentPhase: animationCoordinator.getCurrentPhase(),
                        slug
                    });
                    
                    if (!isCoordinating) {
                        console.log('[transitions] No coordination - rendering header normally');
                        renderHeader(slug, false);
                    } else {
                        console.log('[transitions] Coordination active - header state managed by coordinator');
                        // Header state is being managed by the global coordinator
                        // The coordinator will handle final header state when coordination completes
                    }
                    
                    currentLang = getCurrentLang(); // Update language state
                    
                    // Fix bilingual content display after barba navigation
                    const contentContainer = next.container;
                    if (contentContainer) {
                        const currentLang = getCurrentLang();
                        console.log('[transitions] Ensuring content language consistency:', currentLang);
                        
                        // Force content language state
                        document.documentElement.classList.remove('lang--he', 'lang--en');
                        document.documentElement.classList.add('lang--' + currentLang);
                        document.documentElement.setAttribute('lang', currentLang);
                        document.documentElement.setAttribute('dir', currentLang === 'he' ? 'rtl' : 'ltr');
                    }
                } catch (error) {
                    console.error("[transitions] beforeEnter error:", error);
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
                        
                        // Check if coordinator is managing timing
                        const isCoordinating = animationCoordinator.isCoordinating();
                        
                        console.log('[transitions] Enter hook coordination:', {
                            isCoordinating,
                            currentPhase: animationCoordinator.getCurrentPhase(),
                            progress: animationCoordinator.getCurrentProgress(),
                            coordinationId: animationCoordinator.getCurrentCoordinationId()
                        });
                        
                        if (isCoordinating) {
                            // Faster enter animation for coordination
                            console.log('[transitions] Coordinated enter animation');
                            animateEnterPage(
                                next.container,
                                () => {
                                    // Complete the coordination when page transition finishes
                                    animationCoordinator.completeCoordination();
                                    setTimeout(() => {
                                        resetTransitionGuard();
                                        resolve();
                                    }, ANIM.getDurationMs('transition') * 0.5); // 50% faster
                                },
                                () => {
                                    // Complete the coordination on error too
                                    animationCoordinator.completeCoordination();
                                    resetTransitionGuard();
                                    resolve();
                                },
                                0.2 // Faster duration
                            );
                        } else {
                            // Normal enter animation
                            console.log('[transitions] Normal enter animation');
                            animateEnterPage(
                                next.container,
                                () => {
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
                        console.error("[transitions] enter error:", error);
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