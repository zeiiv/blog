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
    
    // Store animation state in DOM (persists across context changes)
    document.documentElement.setAttribute('data-header-animating', 'true');
    document.documentElement.setAttribute('data-animation-count', this.timelines.length.toString());
    console.log('[animManager] Set DOM data-header-animating = true');

    const cleanup = () => {
      const index = this.timelines.indexOf(tl);
      if (index > -1) this.timelines.splice(index, 1);
      
      // Update DOM state when timeline count changes
      document.documentElement.setAttribute('data-animation-count', this.timelines.length.toString());
      if (this.timelines.length === 0) {
        document.documentElement.removeAttribute('data-header-animating');
        console.log('[animManager] Removed DOM data-header-animating - all animations complete');
      }
    };

    // Chain cleanup with existing callbacks (don't override them)
    const existingOnComplete = tl.eventCallback("onComplete");
    const existingOnInterrupt = tl.eventCallback("onInterrupt");

    console.log('[animManager] Registering timeline with existing callbacks:', {
      hasComplete: !!existingOnComplete,
      hasInterrupt: !!existingOnInterrupt
    });

    tl.eventCallback("onComplete", function () {
      console.log('[animManager] Timeline completed, cleaning up');
      cleanup(); // Clean up FIRST to prevent detection as ongoing
      if (existingOnComplete) existingOnComplete();
    });

    tl.eventCallback("onInterrupt", function () {
      console.log('[animManager] Timeline interrupted, cleaning up');
      cleanup(); // Clean up FIRST to prevent detection as ongoing
      if (existingOnInterrupt) existingOnInterrupt();
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

      // Store navigation callback and trigger during animation
      flipTl._navigationCallback = navigationCallback;

      // Simultaneous approach: Start navigation immediately for true parallel execution
      // This ensures both header animation and content transition begin at the same time
      if (navigationCallback) {
        console.log('[animManager] Starting simultaneous navigation and header animation');
        
        // Add CSS class to persist animation across page change
        const headerElement = document.querySelector('#wordplay-header');
        if (headerElement) {
          headerElement.classList.add('wordplay-animating');
          console.log('[animManager] Added wordplay-animating class for persistence');
        }
        
        // Start navigation with enough delay for animation to establish properly
        // Add additional protection against rapid successive clicks
        const animationCount = animManager.timelines.length;
        const delayMultiplier = Math.min(animationCount, 3); // Cap at 3x delay
        const baseDelay = 150;
        const adaptiveDelay = baseDelay + (delayMultiplier * 50); // Up to 300ms for multiple animations
        
        setTimeout(() => {
          console.log(`[animManager] Starting navigation with adaptive delay: ${adaptiveDelay}ms`);
          try {
            // Double-check that animation is still running before navigating
            const stillAnimating = document.documentElement.hasAttribute('data-header-animating');
            if (stillAnimating) {
              console.log('[animManager] Animation confirmed running, proceeding with navigation');
              navigationCallback();
            } else {
              console.warn('[animManager] Animation finished early, skipping navigation');
            }
          } catch (error) {
            console.error('[animManager] Navigation error:', error);
          }
        }, adaptiveDelay);
      }
      
      // Handle completion and cleanup
      flipTl.eventCallback("onComplete", function () {
        console.log('[animManager] Header transition animation completed, unblocking');
        unblockInteractions(blockElements);
        
        // Clean up animation persistence class
        const headerElement = document.querySelector('#wordplay-header');
        if (headerElement && headerElement.classList.contains('wordplay-animating')) {
          headerElement.classList.remove('wordplay-animating');
          console.log('[animManager] Removed wordplay-animating class on completion');
        }
      });

      flipTl.eventCallback("onInterrupt", function () {
        console.log('[animManager] Header transition animation interrupted, unblocking');
        unblockInteractions(blockElements);
        
        // Clean up animation persistence class on interrupt
        const headerElement = document.querySelector('#wordplay-header');
        if (headerElement && headerElement.classList.contains('wordplay-animating')) {
          headerElement.classList.remove('wordplay-animating');
          console.log('[animManager] Removed wordplay-animating class on interrupt');
        }

        // Fallback navigation if animation was interrupted before navigation trigger
        if (flipTl._navigationCallback && flipTl.progress() < 0.33) {
          try {
            console.log('[animManager] Triggering fallback navigation after early interrupt');
            flipTl._navigationCallback();
          } catch (error) {
            console.error('[animManager] Navigation error after early interrupt:', error);
          }
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

