import gsap, { Flip } from "./vendor.js";
import { SELECTORS, ANIM } from "./config.js";
import { getQuickTween, clearQuickTweens } from "./dom-helpers.js";

/**
 * Collapse pile zone with animation.
 * param {HTMLElement} pileZone
 */
export function collapsePile(pileZone) {
  if (!pileZone) return null;
  return gsap.to(pileZone, {
    height: 0,
    duration: ANIM.getDuration('animateToPinned'),
    ease: ANIM.eases.flat
  });
}

/**
 * Expand pile zone with animation.
 * param {HTMLElement} pileZone
 */
export function expandPile(pileZone) {
  if (!pileZone) return null;
  return gsap.to(pileZone, {
    height: pileZone.scrollHeight,
    duration: ANIM.getDuration('animateToPinned'),
    ease: ANIM.eases.bounce
  });
}

export function animateHeaderFlip(elements) {
  if (!elements || elements.length === 0) return null;
  const state = Flip.getState(elements);
  return Flip.from(state, {
    duration: ANIM.getDuration('header'),
    ease: ANIM.eases.flat,
  });
}
/**
 * Runs the “dip → flip → rise” swap animation.
 * param {GSAPFlipState} state  – Flip.getState([...])
 * param {HTMLElement} newEl     – the newly pinned element
 * param {Array} blockEls        – elements to block/unblock
 * param {Function} isMobile     – returns true on narrow viewports
 * @returns {GSAPTimeline}        – the flippable timeline
 */
export function animateSwap(originalPositions, toElement) {
  if (!toElement) {
    console.warn('[animations] animateSwap: toElement is null');
    return gsap.timeline();
  }
  
  console.log('[animations] animateSwap: creating coordinated animation for all moving elements');
  
  // Create master timeline for all animations
  const masterTl = gsap.timeline();
  
  // Get current pile and pinned zones to find all affected elements
  const pileZone = document.querySelector('.zone-pile');
  const pinnedZone = document.querySelector('.zone-pinned');
  
  // Find all elements that have moved
  const allCurrentElements = [
    ...Array.from(pileZone.children),
    ...Array.from(pinnedZone.children)
  ];
  
  console.log('[animations] Found elements to animate:', {
    originalCount: originalPositions.length,
    currentCount: allCurrentElements.length,
    originalIds: originalPositions.map(p => p.id),
    currentIds: allCurrentElements.map(el => el.querySelector('a')?.dataset.id)
  });
  
  // Force pile animations even if positions haven't changed visually
  const pileElements = Array.from(pileZone.children);
  const forceAnimatePile = pileElements.length > 1; // If pile has multiple elements, animate reordering
  
  console.log('[animations] Pile animation decision:', {
    pileCount: pileElements.length,
    forceAnimatePile,
    pileIds: pileElements.map(el => el.querySelector('a')?.dataset.id)
  });
  
  // Animate each element that has moved
  allCurrentElements.forEach(currentElement => {
    const currentId = currentElement.querySelector('a')?.dataset.id;
    const originalPosition = originalPositions.find(pos => pos.id === currentId);
    
    if (!originalPosition) {
      console.log('[animations] No original position for:', currentId);
      return;
    }
    
    const currentRect = currentElement.getBoundingClientRect();
    const deltaX = originalPosition.rect.left - currentRect.left;
    const deltaY = originalPosition.rect.top - currentRect.top;
    
    // Check if this is the main element going to pinned position
    const isGoingToPinned = currentElement === toElement;
    
    console.log('[animations] Element movement:', {
      id: currentId,
      deltaX,
      deltaY,
      isMoving: Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1,
      isGoingToPinned,
      inPile: !!currentElement.closest('.zone-pile')
    });
    
    // Animate if there's significant movement OR if this is a pile element that should be animated
    const shouldAnimate = Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1 || 
                          (forceAnimatePile && currentElement.closest('.zone-pile') && !isGoingToPinned);
    
    console.log('[animations] Animation decision for', currentId, ':', {shouldAnimate, forceAnimatePile});
    
    if (shouldAnimate) {
      
      if (isGoingToPinned) {
        // Main toPinned animation (3-phase: descend → slide → ascend)
        const dropDist = currentElement.offsetHeight * ANIM.values.dipFactor;
        
        // Clean up animations and quickTo hover cache before starting coordination
        console.log('[animations] Pre-animation cleanup for toPinned element:', currentId);
        const currentTransform = getComputedStyle(currentElement).transform;
        console.log('[animations] Current transform before cleanup:', currentId, currentTransform);
        
        // Use native quickTween cleanup to properly reset hover states
        clearQuickTweens([currentElement]);
        console.log('[animations] Cleared quickTween cache for:', currentId);
        
        // Kill transform animations after clearing quickTo cache
        gsap.killTweensOf(currentElement, "x,y,scale,scaleX,scaleY");
        
        // Reset transforms and start at original position
        gsap.set(currentElement, { x: deltaX, y: deltaY, scale: 1 });
        
        const finalTransform = getComputedStyle(currentElement).transform;
        console.log('[animations] Final transform after position set:', currentId, finalTransform);
        
        console.log('[animations] toPinned animation setup:', {
          currentId,
          startX: deltaX,
          startY: deltaY,
          dropDist,
          descendTo: deltaY + dropDist,
          finalX: 0,
          finalY: 0
        });
        
        // Phase 1: Descend from original position
        masterTl.to(currentElement, {
          y: deltaY + dropDist,
          duration: ANIM.getDuration('pinnedDescend'),
          ease: ANIM.eases.smooth,
          overwrite: false,
          onStart: function() { console.log('[animations] toPinned phase 1 (descend) started for:', currentId); },
          onComplete: function() { console.log('[animations] toPinned phase 1 (descend) completed for:', currentId); }
        }, 0);

        // Phase 2: Slide horizontally while staying low
        masterTl.to(currentElement, {
          x: 0,
          duration: ANIM.getDuration('pinnedSlide'),
          ease: ANIM.eases.smooth,
          overwrite: false,
          onStart: function() { console.log('[animations] toPinned phase 2 (slide) started for:', currentId); },
          onComplete: function() { console.log('[animations] toPinned phase 2 (slide) completed for:', currentId); }
        }, ANIM.getDuration('pinnedDescend')); // Start when descend completes

        // Phase 3: Ascend to final position
        masterTl.to(currentElement, {
          y: 0,
          duration: ANIM.getDuration('pinnedAscend'),
          ease: ANIM.eases.bounce,
          overwrite: false,
          onStart: function() { console.log('[animations] toPinned phase 3 (ascend) started for:', currentId); },
          onComplete: function() { console.log('[animations] toPinned phase 3 (ascend) completed for:', currentId); }
        }, ANIM.getDuration('pinnedDescend') + ANIM.getDuration('pinnedSlide')); // Start when slide completes
        
        console.log('[animations] Added toPinned 3-phase animation for:', currentId);
      } else {
        // toPile or pile reorder animation (simple slide)
        if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
          // Clean up animations and quickTo hover cache before starting coordination
          console.log('[animations] Pre-animation cleanup for toPile element:', currentId);
          const currentTransform = getComputedStyle(currentElement).transform;
          console.log('[animations] Current transform before cleanup:', currentId, currentTransform);
          
          // Use native quickTween cleanup to properly reset hover states
          clearQuickTweens([currentElement]);
          console.log('[animations] Cleared quickTween cache for:', currentId);
          
          // Kill transform animations after clearing quickTo cache
          gsap.killTweensOf(currentElement, "x,y,scale,scaleX,scaleY");
          
          // Reset transforms and start at original position
          gsap.set(currentElement, { x: deltaX, y: deltaY, scale: 1 });
          
          const finalTransform = getComputedStyle(currentElement).transform;
          console.log('[animations] Final transform after position set:', currentId, finalTransform);
          
          masterTl.to(currentElement, {
            x: 0,
            y: 0,
            duration: ANIM.getDuration('animateToPile'),
            ease: ANIM.eases.smooth,
            onStart: function() { console.log('[animations] toPile/reorder animation started for:', currentId); },
            onComplete: function() { console.log('[animations] toPile/reorder animation completed for:', currentId); }
          }, 0); // Start immediately
          
          console.log('[animations] Added real movement animation for:', currentId);
        } else {
          // Clean up animations and quickTo hover cache before starting coordination
          console.log('[animations] Pre-animation cleanup for forced pile element:', currentId);
          const currentTransform = getComputedStyle(currentElement).transform;
          console.log('[animations] Current transform before cleanup:', currentId, currentTransform);
          
          // Use native quickTween cleanup to properly reset hover states
          clearQuickTweens([currentElement]);
          console.log('[animations] Cleared quickTween cache for:', currentId);
          
          // Kill transform animations after clearing quickTo cache
          gsap.killTweensOf(currentElement, "x,y,scale,scaleX,scaleY");
          
          // Reset transforms and apply forced animation values
          gsap.set(currentElement, { x: -10, y: 0, scale: 0.98 });
          
          const finalTransform = getComputedStyle(currentElement).transform;
          console.log('[animations] Final transform after forced animation set:', currentId, finalTransform);
          
          masterTl.to(currentElement, {
            x: 0,
            scale: 1,
            duration: ANIM.getDuration('animateToPile') * 0.6,
            ease: ANIM.eases.smooth,
            onStart: function() { console.log('[animations] Forced pile animation started for:', currentId); },
            onComplete: function() { console.log('[animations] Forced pile animation completed for:', currentId); }
          }, 0.1); // Small delay
          
          console.log('[animations] Added forced pile animation for:', currentId);
        }
      }
    } else {
      console.log('[animations] Skipping animation for', currentId, '- insufficient movement:', {deltaX, deltaY});
    }
  });
  
  // Note: Progress tracking handled by global coordinator now

  // Add safeguards to ensure animation always completes
  masterTl.eventCallback("onComplete", function() {
    console.log('[animations] animateSwap completed successfully');
    
    // Clear all transforms and reset quickTo functions to restore hover functionality
    allCurrentElements.forEach(function(el) {
      if (el) {
        gsap.set(el, { clearProps: "transform" });
        
        // Clear and recreate quickTo functions to prevent "not eligible for reset" errors
        Object.getOwnPropertyNames(el).forEach(prop => {
          if (prop.startsWith('_quick_')) {
            delete el[prop];
          }
        });
      }
    });
    console.log('[animations] Cleared transforms and quickTo cache to restore hover functionality');
  });
  
  masterTl.eventCallback("onInterrupt", function() {
    console.warn('[animations] animateSwap was interrupted - clearing transforms');
    // Clear any partial transforms on interruption
    allCurrentElements.forEach(function(el) {
      if (el) {
        gsap.set(el, { x: 0, y: 0, clearProps: "transform" });
      }
    });
  });
  
  // Add timeout safety net
  const duration = masterTl.duration();
  if (duration > 0) {
    setTimeout(function() {
      if (masterTl.progress() < 1 && !masterTl.paused()) {
        console.warn('[animations] Animation timeout - forcing completion');
        masterTl.progress(1);
      }
    }, (duration + 0.5) * 1000); // 500ms buffer
  }

  console.log('[animations] Coordinated animation created - duration:', masterTl.duration());

  return masterTl;
}

/**
 * Animates the “place-click” FLIP (no dip/rise)
 * param {HTMLElement[]} children – the pile children
 * @returns {GSAPTimeline}
 */
export function animatePlaceFlip(children, pinnedElementData = null) {
  console.log('[animations] animatePlaceFlip called with', children.length, 'children');
  console.log('[animations] Pinned element data:', pinnedElementData?.id);
  
  // Create animation timeline 
  const tl = gsap.timeline();
  
  if (children.length === 0) {
    console.log('[animations] No children to animate');
    return tl;
  }
  
  // Find the returning word and other words
  let returningWord = null;
  let otherWords = Array.from(children);
  
  if (pinnedElementData) {
    returningWord = Array.from(children).find(child => 
      child.querySelector('a')?.dataset.id === pinnedElementData.id
    );
    
    if (returningWord) {
      otherWords = Array.from(children).filter(child => child !== returningWord);
      console.log('[animations] Found returning word:', pinnedElementData.id);
    }
  }
  
  console.log('[animations] Other words to reorder:', otherWords.map(el => el.querySelector('a')?.dataset.id));
  
  // Coordinate all animations to happen together
  let mainAnimationDuration = ANIM.getDuration('animateToPile');
  
  // Animate the returning word with toPile animation if we have position data
  if (returningWord && pinnedElementData) {
    // Calculate where it should start (original pinned position)
    const newRect = returningWord.getBoundingClientRect();
    const deltaX = pinnedElementData.rect.left - newRect.left;
    const deltaY = pinnedElementData.rect.top - newRect.top;
    
    console.log('[animations] Returning word animation setup:', {
      deltaX,
      deltaY,
      fromPinned: pinnedElementData.rect.left,
      toPile: newRect.left,
      hasAnimation: Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1
    });
    
    // Only animate if there's actual movement
    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      // Start at pinned position and animate to pile position
      gsap.set(returningWord, { x: deltaX, y: deltaY });
      
      // Add toPile animation at start of timeline
      tl.to(returningWord, {
        x: 0,
        y: 0,
        duration: mainAnimationDuration,
        ease: ANIM.eases.smooth,
        onStart: function() { console.log('[animations] Returning word animation started'); },
        onComplete: function() { console.log('[animations] Returning word animation completed'); }
      }, 0); // Start at beginning of timeline
    } else {
      console.log('[animations] No significant movement for returning word');
    }
  } else if (returningWord) {
    console.log('[animations] Using fallback animation for returning word');
    // Fallback: simple drop animation if no position data
    const dropDist = returningWord.offsetHeight * ANIM.values.dipFactor;
    gsap.set(returningWord, { y: -dropDist });
    
    tl.to(returningWord, {
      y: 0,
      duration: mainAnimationDuration,
      ease: ANIM.eases.bounce,
      onStart: function() { console.log('[animations] Fallback animation started'); },
      onComplete: function() { console.log('[animations] Fallback animation completed'); }
    }, 0); // Start at beginning of timeline
  } else {
    console.log('[animations] No returning word found:', {
      hasReturningWord: !!returningWord,
      hasPinnedData: !!pinnedElementData,
      childrenIds: Array.from(children).map(el => el.querySelector('a')?.dataset.id)
    });
  }
  
  // Animate other words sliding into their new positions (simultaneously)
  if (otherWords.length > 0) {
    console.log('[animations] Animating', otherWords.length, 'pile words simultaneously');
    otherWords.forEach((word, index) => {
      // Set initial position for all pile words
      gsap.set(word, { x: -15 });
      
      // Stagger the pile animations to start slightly after the returning word; 
      tl.to(word, {
        x: 0,
        duration: ANIM.getDuration('header') * 0.4,
        ease: ANIM.eases.smooth,
        onStart: function() { console.log('[animations] Pile word', index, 'animation started'); },
        onComplete: function() { console.log('[animations] Pile word', index, 'animation completed'); }
      }, index * 0.05 + 0.1); // Start 100ms after timeline begins, with stagger
    });
  } else {
    console.log('[animations] No other words to animate');
  }
  
  console.log('[animations] Place flip animation created - duration:', tl.duration());
  
  // Clear transforms when animation completes to restore hover functionality
  tl.eventCallback("onComplete", function() {
    console.log('[animations] Place flip animation completed, clearing transforms');
    children.forEach(function(child) {
      if (child) {
        gsap.set(child, { clearProps: "transform" });
        
        // Clear and recreate quickTo functions to prevent "not eligible for reset" errors
        Object.getOwnPropertyNames(child).forEach(prop => {
          if (prop.startsWith('_quick_')) {
            delete child[prop];
          }
        });
      }
    });
    console.log('[animations] Cleared transforms and quickTo cache to restore hover functionality');
  });
  
  // Timeline should auto-play by default
  
  return tl;
}


/**
 * Animate leaving the page (fade and slide out).
 * param {HTMLElement} container
 * @returns {Promise}
 */
export function animateLeavePage(container) {
  if (!container) return Promise.resolve();
  const dur = ANIM.getDuration('fade');
  const dirAttr = document.documentElement.getAttribute('dir');
  const dirOffset = dirAttr === 'rtl' ? -50 : 50;
  return gsap.to(container, {
    autoAlpha: 0,
    x: dirOffset,
    duration: dur,
    ease: ANIM.eases.smooth
  }).then(function() {});
}

/**
 * Animate entering the page (fade and slide in).
 * param {HTMLElement} container
 * param {Function} onComplete – called when animation completes
 * param {Function} onInterrupt – called if animation is interrupted
 * @returns {void}
 */
export function animateEnterPage(container, onComplete, onInterrupt) {
  if (!container) {
    if (onComplete) onComplete();
    return;
  }
  const dur = ANIM.getDuration('fade');
  const dirAttr = document.documentElement.getAttribute('dir');
  const dirOffset = dirAttr === 'rtl' ? -50 : 50;
  gsap.set(container, { autoAlpha: 0, x: dirOffset, visibility: "visible" });
  gsap.to(container, {
    autoAlpha: 1,
    x: 0,
    duration: dur,
    ease: ANIM.eases.smooth,
    onComplete,
    onInterrupt
  });
}

/**
 * Animates hover-in effect for word items.
 * param {HTMLElement} item
 * param {boolean} isPileZone
 */
export function animateHoverIn(item, isPileZone) {
  if (!item) return;
  const prop = isPileZone ? "y" : "scale";
  const value = isPileZone ? -ANIM.values.hoverNudge : 1.2;
  getQuickTween(item, prop, {
    duration: ANIM.getDuration('hover'),
    ease: ANIM.eases.bounce,
    overwrite: "auto"
  })(value);
}

/**
 * Animates hover-out effect for word items.
 * param {HTMLElement} item
 * param {boolean} isPileZone
 */
export function animateHoverOut(item, isPileZone) {
  if (!item) return;
  const prop = isPileZone ? "y" : "scale";
  const value = isPileZone ? 0 : 1;
  getQuickTween(item, prop, {
    duration: ANIM.getDuration('hover'),
    ease: ANIM.eases.bounce,
    overwrite: "auto"
  })(value);
}

/**
 * Animates language toggle button during language switch
 * param {HTMLElement} langToggle
 */
export function animateLanguageToggle(langToggle) {
  if (!langToggle) return;
  
  console.log('[animations] Language toggle animation started');
  
  return gsap.to(langToggle, {
    scale: 1.2,
    duration: 0.15,
    ease: "back.out(1.7)",
    yoyo: true,
    repeat: 1,
    onComplete: function() {
      console.log('[animations] Language toggle animation completed');
    }
  });
}

/**
 * Animates all header elements during language direction change (RTL ↔ LTR)
 * Captures positions before language change, applies change, then animates to new positions
 * @param {Function} applyLanguageCallback - Function that changes language and re-renders header
 * @returns {Timeline} GSAP timeline
 */
export function animateLanguageDirectionChange(applyLanguageCallback) {
  console.log('[animations] Language direction change animation started');
  
  // Get all header elements that will be affected by direction change
  const placeZone = document.querySelector(SELECTORS.placeZone);
  const pinnedZone = document.querySelector(SELECTORS.pinnedZone);
  const pileZone = document.querySelector(SELECTORS.pileZone);
  const langToggle = document.querySelector(SELECTORS.langToggle);
  
  const allHeaderElements = [
    placeZone,
    ...Array.from(pinnedZone.children),
    ...Array.from(pileZone.children),
    langToggle
  ].filter(Boolean);
  
  console.log('[animations] Capturing', allHeaderElements.length, 'header elements for direction change');
  
  // Capture initial state with Flip
  const flipState = Flip.getState(allHeaderElements);
  
  // Apply language change (this changes direction and re-renders header)
  applyLanguageCallback();
  
  // Animate from old positions to new positions
  const flipAnimation = Flip.from(flipState, {
    duration: ANIM.getDuration('header'),
    ease: ANIM.eases.flat,
    onStart: function() {
      console.log('[animations] Language direction flip animation started');
    },
    onComplete: function() {
      console.log('[animations] Language direction flip animation completed');
    }
  });
  
  // Wrap in a timeline to ensure proper event handling for anim-manager
  const tl = gsap.timeline();
  tl.add(flipAnimation);
  
  return tl;
}


/**
 * Composite animation for language switch:
 * 1. Capture Flip state.
 * 2. Start Flip and fade-out in parallel.
 * 3. When fade-out finishes, change language and re-render header.
 * 4. Capture new Flip state and animate header (after re-render).
 * 5. Fade in the content.
 * @param {Object} params
 * @param {string} params.newLang
 * @param {Function} params.applyLanguage – changes language + direction
 * @param {Function} params.renderHeader – re-renders header with new layout
 * @returns {Promise}
 */
export function animateLanguageTransition({ newLang, applyLanguage, renderHeader }) {
  console.log('[animations] Language transition started for:', newLang);
  
  return new Promise((resolve, reject) => {
    try {
      const content = document.querySelector(SELECTORS.container);
      const placeZone = document.querySelector(SELECTORS.placeZone);
      const pinnedZone = document.querySelector(SELECTORS.pinnedZone);
      const pileZone = document.querySelector(SELECTORS.pileZone);
      const langToggle = document.querySelector(SELECTORS.langToggle);

      console.log('[animations] Language transition elements found:', {
        content: !!content,
        placeZone: !!placeZone,
        pinnedZone: !!pinnedZone,
        pileZone: !!pileZone,
        langToggle: !!langToggle
      });

      // Capture all elements that will be affected by the language change
      const flipTargets = [
        ...Array.from(placeZone.children),
        ...Array.from(pinnedZone.children), 
        ...Array.from(pileZone.children),
        langToggle
      ].filter(Boolean);
      
      console.log('[animations] Captured flip targets:', flipTargets.length);
      
      // Create timeline with logging
      const masterTl = gsap.timeline({
        onComplete: function() {
          console.log('[animations] Language transition completed');
          resolve();
        },
        onInterrupt: function() {
          console.warn('[animations] Language transition interrupted');
          reject(new Error('Language transition interrupted'));
        }
      });

      // Phase 1: Capture initial state and start fade out
      const flipState = Flip.getState(flipTargets);
      console.log('[animations] Initial flip state captured');

      // Fade out content while preserving header
      masterTl.to(content, {
        autoAlpha: 0,
        duration: ANIM.getDuration('fade'),
        ease: ANIM.eases.smooth,
        onStart: function() { console.log('[animations] Content fade out started'); },
        onComplete: function() { console.log('[animations] Content fade out completed'); }
      }, 0);

      // Phase 2: Apply language changes at the right time
      masterTl.call(function() {
        console.log('[animations] Applying language change to:', newLang);
        applyLanguage(newLang, true);
        renderHeader('place', false); // Don't animate header render during language switch
      }, [], this, ANIM.getDuration('fade'));

      // Phase 3: Animate header elements with Flip
      masterTl.call(function() {
        console.log('[animations] Starting header flip animation');
        
        // Animate the header elements with Flip
        const flipAnimation = Flip.from(flipState, {
          duration: ANIM.getDuration('header'),
          ease: ANIM.eases.flat,
          onStart: function() { console.log('[animations] Header flip started'); },
          onComplete: function() { console.log('[animations] Header flip completed'); }
        });
        
        // Add the flip animation to the timeline
        masterTl.add(flipAnimation, ANIM.getDuration('fade') + 0.1);
      }, [], this, ANIM.getDuration('fade') + 0.1);

      // Phase 4: Fade content back in
      masterTl.to(content, {
        autoAlpha: 1,
        duration: ANIM.getDuration('fade'),
        ease: ANIM.eases.smooth,
        onStart: function() { console.log('[animations] Content fade in started'); },
        onComplete: function() { console.log('[animations] Content fade in completed'); }
      }, ANIM.getDuration('fade') + ANIM.getDuration('header'));

      console.log('[animations] Language transition timeline created - duration:', masterTl.duration());
      
    } catch (error) {
      console.error('[animations] Language transition setup error:', error);
      reject(error);
    }
  });
}