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
        
        // Initial render
        renderHeader(initialSlug);
        
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
