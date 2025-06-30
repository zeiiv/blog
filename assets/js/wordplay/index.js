import { SELECTORS } from "./config.js";
import { initHeaderInteractions, renderHeader } from "./header-render.js";
import { initLanguageSwitcher, getCurrentLang } from "./language.js";
import { initPageTransitions } from "./transitions.js";
import { animManager } from "./anim-manager.js";

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('[wordplay] Initializing...');
        
        // Get main container and initial slug
        const mainContainer = document.querySelector(SELECTORS.container);
        const initialSlug = mainContainer?.dataset.barbaNamespace || 'place';
        
        // Check for ongoing animations before initializing header
        const headerElement = document.querySelector('#wordplay-header');
        const hasOngoingAnimation = headerElement && headerElement.classList.contains('wordplay-animating');
        const hasAnimationState = document.documentElement.hasAttribute('data-header-animating');
        
        // Check if any word items have transforms (indicating ongoing GSAP animations)
        const wordItems = document.querySelectorAll('.word-item');
        const hasTransforms = Array.from(wordItems).some(item => {
            const transform = window.getComputedStyle(item).transform;
            return transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)';
        });
        
        // Check for recent navigation flag
        const navigationTimestamp = sessionStorage.getItem('wordplay-navigating');
        const hasRecentNavigation = navigationTimestamp && (Date.now() - parseInt(navigationTimestamp)) < 2000; // Within 2 seconds
        
        // Enhanced detection - check for very recent navigation OR if we're in barba transition
        const hasQuickNavigation = hasRecentNavigation && (Date.now() - parseInt(navigationTimestamp)) < 800; // Extended window
        const isInBarbaTransition = document.documentElement.classList.contains('barba-transitioning') || 
                                   document.body.classList.contains('barba-transitioning');
        
        console.log('[wordplay] Navigation flag check:', {
            navigationTimestamp,
            hasRecentNavigation,
            hasQuickNavigation,
            isInBarbaTransition,
            timeDiff: navigationTimestamp ? Date.now() - parseInt(navigationTimestamp) : 'no timestamp'
        });
        
        // Enhanced animation detection - check if header has wordplay-animating class
        const hasAnimatingClass = headerElement && headerElement.classList.contains('wordplay-animating');
        
        console.log('[wordplay] Animation detection:', {
            hasOngoingAnimation,
            hasAnimationState,
            hasTransforms,
            hasQuickNavigation,
            isInBarbaTransition,
            hasAnimatingClass,
            wordItemCount: wordItems.length,
            shouldSkip: hasOngoingAnimation || hasAnimationState || hasTransforms || hasQuickNavigation || isInBarbaTransition || hasAnimatingClass
        });
        
        if (hasOngoingAnimation || hasAnimationState || hasTransforms || hasQuickNavigation || isInBarbaTransition || hasAnimatingClass) {
            console.log('[wordplay] Skipping header initialization - animation in progress');
            
            // Wait for animation to complete before initializing (with timeout to prevent infinite loops)
            let checkCount = 0;
            const maxChecks = 50; // 5 seconds max wait time
            
            const checkAndInit = () => {
                checkCount++;
                
                const stillAnimating = (headerElement && headerElement.classList.contains('wordplay-animating')) ||
                                     document.documentElement.hasAttribute('data-header-animating');
                
                const stillHasTransforms = Array.from(document.querySelectorAll('.word-item')).some(item => {
                    const transform = window.getComputedStyle(item).transform;
                    return transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)';
                });
                
                // Simple check for quick navigation
                const navTimestamp = sessionStorage.getItem('wordplay-navigating');
                const stillHasQuickNav = navTimestamp && (Date.now() - parseInt(navTimestamp)) < 400;
                
                if (!stillAnimating && !stillHasTransforms && !stillHasQuickNav) {
                    console.log('[wordplay] Animation cleared - initializing header');
                    renderHeader(initialSlug);
                } else if (checkCount >= maxChecks) {
                    console.warn('[wordplay] Timeout waiting for animations to clear, forcing initialization');
                    // Force clear any stuck transforms and flags
                    document.querySelectorAll('.word-item').forEach(item => {
                        item.style.transform = '';
                    });
                    sessionStorage.removeItem('wordplay-navigating');
                    renderHeader(initialSlug);
                } else {
                    console.log('[wordplay] Still animating, checking again...', {
                        checkCount,
                        stillAnimating,
                        stillHasTransforms,
                        stillHasQuickNav
                    });
                    setTimeout(checkAndInit, 100);
                }
            };
            setTimeout(checkAndInit, 100);
        } else {
            console.log('[wordplay] Initializing header normally');
            renderHeader(initialSlug);
        }
        
        // Initialize header interactions
        initHeaderInteractions(renderHeader);
        
        // Initialize language switcher
        initLanguageSwitcher(renderHeader);
        
        // Initialize page transitions
        initPageTransitions({ renderHeader, getCurrentLang });
        
        console.log('[wordplay] Initialization complete');
        
        // Clean up on page unload (backup safety)
        window.addEventListener('beforeunload', () => {
            animManager.fullCleanup();
        });
        
    } catch (error) {
        console.error('[wordplay] Initialization error:', error);
    }
});
