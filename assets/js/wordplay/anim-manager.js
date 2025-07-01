import gsap from "./vendor.js";
import { clearQuickTweens, blockInteractions, unblockInteractions, isMobile } from "./dom-helpers.js";
import { SELECTORS, EVENTS } from "./config.js";
import { animateSwap } from "./animations.js";
import { animationCoordinator } from "./coordinator.js";

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
      console.log('[animManager] Timeline cleanup - remaining count:', this.timelines.length);
    };

    // Chain cleanup with existing callbacks (don't override them)
    const existingOnComplete = tl.eventCallback("onComplete");
    const existingOnInterrupt = tl.eventCallback("onInterrupt");

    tl.eventCallback("onComplete", function () {
      cleanup();
      if (existingOnComplete) existingOnComplete();
    });

    tl.eventCallback("onInterrupt", function () {
      cleanup();
      if (existingOnInterrupt) existingOnInterrupt();
    });

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

  // Check if we have active animations
  hasActiveAnimations() {
    return this.timelines.length > 0 || animationCoordinator.isCoordinating();
  },

  // Helper: Clean transforms and quickTo cache to restore hover functionality
  cleanupTransforms() {
    const allWordItems = document.querySelectorAll('.word-item');
    allWordItems.forEach(function(el) {
      if (el) {
        gsap.set(el, { clearProps: "transform" });
        Object.getOwnPropertyNames(el).forEach(prop => {
          if (prop.startsWith('_quick_')) {
            delete el[prop];
          }
        });
      }
    });
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
   * High-level header transition orchestration using global coordinator
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
    blockElements = [],
    earlyPositions = null
  }) {
    try {
      console.log('[animManager] Starting coordinated header transition');
      
      // 1. Use early-captured positions or capture them now
      let originalPositions;
      
      if (earlyPositions) {
        console.log('[animManager] Using early-captured positions to avoid hover interference');
        originalPositions = earlyPositions;
      } else {
        console.log('[animManager] Capturing positions now (fallback)');
        const validElements = fromElements.filter(Boolean);
        const pileZone = document.querySelector(SELECTORS.pileZone);
        const pinnedZone = document.querySelector(SELECTORS.pinnedZone);

        const allAffectedElements = [
          ...validElements,
          ...Array.from(pileZone.children),
          ...Array.from(pinnedZone.children)
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

        originalPositions = uniqueElements.map(el => ({
          element: el,
          id: el.querySelector('a')?.dataset.id,
          rect: el.getBoundingClientRect()
        }));
      }

      // 2. Block interactions
      blockInteractions(blockElements);

      // 3. Mobile-specific preparation
      if (isMobile()) {
        const pileZone = document.querySelector(SELECTORS.pileZone);
        if (pileZone) {
          pileZone.dispatchEvent(new Event(EVENTS.PILE_SHRINK));
        }
      }

      // 4. Perform DOM changes
      domChangeCallback();

      // 5. Get the final element after DOM changes
      const finalElement = getToElement();

      // 6. Create header animation
      const flipTl = animateSwap(originalPositions, finalElement);

      // 7. Set up completion handling
      const cleanupHandler = () => {
        console.log('[animManager] Header animation finished, unblocking');
        unblockInteractions(blockElements);
        this.cleanupTransforms();
      };

      flipTl.eventCallback("onComplete", cleanupHandler);
      flipTl.eventCallback("onInterrupt", cleanupHandler);

      // 8. Register timeline locally
      this.registerTimeline(flipTl);

      // 9. Start coordinated sequence using global coordinator
      const coordinationId = `coord_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      animationCoordinator.startCoordination({
        headerAnimation: flipTl,
        pageTransitionTrigger: navigationCallback,
        coordinationId
      });

      console.log('[animManager] Coordinated sequence started:', coordinationId);

    } catch (error) {
      console.error('[animManager] Header transition error:', error);
      unblockInteractions(blockElements);
    }
  }
};

