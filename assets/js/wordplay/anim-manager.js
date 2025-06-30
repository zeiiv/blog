import gsap from "./vendor.js";
import { clearQuickTweens, blockInteractions, unblockInteractions, isMobile } from "./dom-helpers.js";
import { SELECTORS, EVENTS } from "./config.js";
import { animateSwap } from "./animations.js";

export const animManager = {
  persistentContexts: [],
  timelines: [],

  // Register a context that should stick around (do not revert on click)
  registerPersistent(ctx) {
    if (ctx) this.persistentContexts.push(ctx);
    return ctx;
  },

  // Register and store a persistent GSAP context, using a setup function and scope
  registerContext(scope, setupFn) {
    const ctx = gsap.context(setupFn, scope);
    return this.registerPersistent(ctx);
  },

  registerTimeline(tl) {
    if (!tl) return tl;

    console.log('[animManager] registerTimeline called');
    
    this.timelines.push(tl);

    const cleanup = () => {
      const index = this.timelines.indexOf(tl);
      if (index > -1) this.timelines.splice(index, 1);
    };

    // Chain cleanup with existing callbacks (don't override them)
    const existingOnComplete = tl.eventCallback("onComplete");
    const existingOnInterrupt = tl.eventCallback("onInterrupt");

    console.log('[animManager] Registering timeline with existing callbacks:', {
      hasComplete: !!existingOnComplete,
      hasInterrupt: !!existingOnInterrupt
    });

    tl.eventCallback("onComplete", () => {
      console.log('[animManager] Timeline completed, calling original callback');
      if (existingOnComplete) existingOnComplete();
      cleanup();
    });

    tl.eventCallback("onInterrupt", () => {
      console.log('[animManager] Timeline interrupted, calling original callback');
      if (existingOnInterrupt) existingOnInterrupt();
      cleanup();
    });

    console.log('[animManager] registerTimeline completed');
    return tl;
  },

  // Clean up all timelines
  killAll() {
    this.timelines.forEach(tl => {
      try {
        if (tl && tl.kill) {
          // Clear callbacks before killing to prevent memory leaks
          tl.eventCallback("onComplete", null);
          tl.eventCallback("onInterrupt", null);
          tl.kill();
        }
      } catch (error) {
        console.warn("[animManager] Error killing timeline:", error);
      }
    });
    this.timelines = [];
  },

  // Clean up persistent contexts
  revertAll() {
    this.persistentContexts.forEach(ctx => {
      try {
        if (ctx && ctx.revert) ctx.revert();
      } catch (error) {
        console.warn("[animManager] Error reverting context:", error);
      }
    });
    this.persistentContexts = [];
  },

  // Complete cleanup - call when leaving page or major state change
  fullCleanup() {
    this.killAll();
    this.revertAll();
    
    // Clear quickTo caches from all interactive elements
    const allInteractiveElements = [
      ...document.querySelectorAll(SELECTORS.wordItem),
      ...document.querySelectorAll(SELECTORS.wordLink),
      document.querySelector(SELECTORS.pileZone),
      document.querySelector(SELECTORS.pinnedZone),
      document.querySelector(SELECTORS.langToggle)
    ].filter(Boolean);
    
    clearQuickTweens(allInteractiveElements);
  },

  /**
   * High-level header transition orchestration
   * Encapsulates the entire sequence: capture state, DOM changes, animation, navigation
   * @param {Object} context - Animation context
   * @param {HTMLElement[]} context.fromElements - Elements to animate from
   * @param {Function} context.getToElement - Function that returns target element after DOM changes
   * @param {Function} context.domChangeCallback - Function that performs DOM mutations
   * @param {Function} context.navigationCallback - Function to trigger page navigation
   * @param {HTMLElement[]} context.blockElements - Elements to block during animation
   */
  animateHeaderTransition({
    fromElements,
    getToElement,
    domChangeCallback,
    navigationCallback,
    blockElements = []
  }) {
    try {
      // 1. Capture animation state before DOM changes
      const validElements = fromElements.filter(Boolean);
      console.log('[animManager] Capturing elements for animation:', validElements.length);

      // 2. Capture original positions BEFORE DOM changes
      // Include ALL elements that might be affected (pile + pinned + selected elements)
      const pileZone = document.querySelector(SELECTORS.pileZone);
      const pinnedZone = document.querySelector(SELECTORS.pinnedZone);
      
      const allAffectedElements = [
        ...validElements, // The main swap elements
        ...Array.from(pileZone.children), // All pile elements
        ...Array.from(pinnedZone.children) // All pinned elements
      ];
      
      // Remove duplicates by ID
      const uniqueElements = [];
      const seenIds = new Set();
      allAffectedElements.forEach(el => {
        const id = el.querySelector('a')?.dataset.id;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          uniqueElements.push(el);
        }
      });
      
      const originalPositions = uniqueElements.map(el => ({
        element: el,
        id: el.querySelector('a')?.dataset.id,
        rect: el.getBoundingClientRect()
      }));
      
      console.log('[animManager] Captured original positions:', originalPositions.map(p => ({
        id: p.id,
        left: p.rect.left,
        top: p.rect.top
      })));

      // 3. Block interactions
      blockInteractions(blockElements);

      // 4. Mobile-specific preparation
      if (isMobile()) {
        const pileZone = document.querySelector(SELECTORS.pileZone);
        if (pileZone) {
          pileZone.dispatchEvent(new Event(EVENTS.PILE_SHRINK));
        }
      }

      // 5. Perform DOM changes
      domChangeCallback();

      // 6. Get the final element after DOM changes
      const finalElement = getToElement();

      // 7. Create and run animation with original positions and final element
      const flipTl = animateSwap(originalPositions, finalElement);
      
      console.log('[animManager] Animation created - duration:', flipTl.duration(), 'totalDuration:', flipTl.totalDuration());
      
      // Trigger navigation with delay and error handling
      if (navigationCallback) {
        setTimeout(() => {
          try {
            console.log('[animManager] Triggering navigation with minimal delay');
            navigationCallback();
          } catch (error) {
            console.error('[animManager] Navigation error:', error);
            console.error('[animManager] Error details:', {
              message: error.message,
              stack: error.stack,
              barbaExists: !!window.barba
            });
            // Ensure interactions are unblocked on navigation error
            unblockInteractions(blockElements);
          }
        }, 100); // Short delay to let header animation start
      }

      // Add unblocking to animation completion
      flipTl.eventCallback("onComplete", () => {
        console.log('[animManager] Header transition animation completed, unblocking');
        unblockInteractions(blockElements);
      });
      
      flipTl.eventCallback("onInterrupt", () => {
        console.log('[animManager] Header transition animation interrupted, unblocking');
        unblockInteractions(blockElements);
        
        // Still navigate even if interrupted
        if (navigationCallback) {
          console.log('[animManager] Triggering navigation after animation interrupt');
          navigationCallback();
        }
      });
      
      // Safety net: ensure interactions are always unblocked
      const animationDuration = flipTl.duration();
      if (animationDuration > 0) {
        setTimeout(() => {
          if (flipTl.progress() < 1) {
            console.warn('[animManager] Animation safety timeout - forcing unblock');
            unblockInteractions(blockElements);
            flipTl.kill();
          }
        }, (animationDuration + 1) * 1000); // 1 second buffer
      }
      
      this.registerTimeline(flipTl);

    } catch (error) {
      console.error('[wordplay] Header transition error:', error);
      // Ensure interactions are unblocked on error
      unblockInteractions(blockElements);
    }
  }
};

