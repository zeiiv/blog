import gsap from "./vendor.js";
import { SELECTORS } from "./config.js";
import { initHeaderInteractions, renderHeader } from "./header-render.js";
import { initLanguageSwitcher, getCurrentLang } from "./language.js";
import { initPageTransitions } from "./transitions.js";
import { animManager } from "./anim-manager.js";
import { animationCoordinator } from "./coordinator.js";

// Note: Coordinator is automatically attached to window in coordinator.js

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('[wordplay] Initializing...');
        
        // Get main container and initial slug
        const mainContainer = document.querySelector(SELECTORS.container);
        const initialSlug = mainContainer?.dataset.barbaNamespace || 'place';
        
        // Simple initialization - coordinator handles persistence now
        console.log('[wordplay] Initializing header');
        renderHeader(initialSlug);
        
        // Initialize header interactions
        initHeaderInteractions(renderHeader);
        
        // Initialize language switcher
        initLanguageSwitcher(renderHeader);
        
        // Initialize page transitions
        initPageTransitions({ renderHeader, getCurrentLang });
        
        console.log('[wordplay] Initialization complete');
        
        // Note: Coordinator manages its own cleanup via master timeline completion
        // No manual cleanup needed - let coordination complete naturally
        
    } catch (error) {
        console.error('[wordplay] Initialization error:', error);
    }
});
