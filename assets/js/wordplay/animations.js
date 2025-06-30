import gsap, { Flip } from "./vendor.js";
import { SELECTORS, ANIM } from "./config.js";
import { getQuickTween } from "./dom-helpers.js";

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
        // Main toPinned animation (3-phase)
        const dropDist = currentElement.offsetHeight * ANIM.values.dipFactor;
        
        // Start at original position
        gsap.set(currentElement, { x: deltaX, y: deltaY });
        
        // Phase 1: Descend
        masterTl.to(currentElement, {
          y: deltaY + dropDist,
          duration: ANIM.getDuration('pinnedDescend'),
          ease: ANIM.eases.smooth,
          onStart: () => console.log('[animations] toPinned phase 1 (descend) started for:', currentId),
          onComplete: () => console.log('[animations] toPinned phase 1 (descend) completed for:', currentId)
        }, 0);

        // Phase 2: Slide horizontally
        masterTl.to(currentElement, {
          x: 0,
          duration: ANIM.getDuration('pinnedSlide'),
          ease: ANIM.eases.smooth,
          onStart: () => console.log('[animations] toPinned phase 2 (slide) started for:', currentId),
          onComplete: () => console.log('[animations] toPinned phase 2 (slide) completed for:', currentId)
        }, ANIM.getDuration('pinnedDescend'));

        // Phase 3: Ascend
        masterTl.to(currentElement, {
          y: 0,
          duration: ANIM.getDuration('pinnedAscend'),
          ease: ANIM.eases.bounce,
          onStart: () => console.log('[animations] toPinned phase 3 (ascend) started for:', currentId),
          onComplete: () => console.log('[animations] toPinned phase 3 (ascend) completed for:', currentId)
        }, ANIM.getDuration('pinnedDescend') + ANIM.getDuration('pinnedSlide'));
        
        console.log('[animations] Added toPinned 3-phase animation for:', currentId);
      } else {
        // toPile or pile reorder animation (simple slide)
        if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
          // Real movement animation
          gsap.set(currentElement, { x: deltaX, y: deltaY });
          
          masterTl.to(currentElement, {
            x: 0,
            y: 0,
            duration: ANIM.getDuration('animateToPile'),
            ease: ANIM.eases.smooth,
            onStart: () => console.log('[animations] toPile/reorder animation started for:', currentId),
            onComplete: () => console.log('[animations] toPile/reorder animation completed for:', currentId)
          }, 0); // Start immediately
          
          console.log('[animations] Added real movement animation for:', currentId);
        } else {
          // Forced pile reorder animation (subtle effect even with no position change)
          gsap.set(currentElement, { x: -10, scale: 0.98 });
          
          masterTl.to(currentElement, {
            x: 0,
            scale: 1,
            duration: ANIM.getDuration('animateToPile') * 0.6,
            ease: ANIM.eases.smooth,
            onStart: () => console.log('[animations] Forced pile animation started for:', currentId),
            onComplete: () => console.log('[animations] Forced pile animation completed for:', currentId)
          }, 0.1); // Small delay
          
          console.log('[animations] Added forced pile animation for:', currentId);
        }
      }
    } else {
      console.log('[animations] Skipping animation for', currentId, '- insufficient movement:', {deltaX, deltaY});
    }
  });
  
  // Add safeguards to ensure animation always completes
  masterTl.eventCallback("onComplete", () => {
    console.log('[animations] animateSwap completed successfully');
  });
  
  masterTl.eventCallback("onInterrupt", () => {
    console.warn('[animations] animateSwap was interrupted - clearing transforms');
    // Clear any partial transforms on interruption
    allCurrentElements.forEach(el => {
      if (el) {
        gsap.set(el, { x: 0, y: 0, clearProps: "transform" });
      }
    });
  });
  
  // Add timeout safety net
  const duration = masterTl.duration();
  if (duration > 0) {
    setTimeout(() => {
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
        onStart: () => console.log('[animations] Returning word animation started'),
        onComplete: () => console.log('[animations] Returning word animation completed')
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
      onStart: () => console.log('[animations] Fallback animation started'),
      onComplete: () => console.log('[animations] Fallback animation completed')
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
      
      // Stagger the pile animations to start slightly after the returning word
      tl.to(word, {
        x: 0,
        duration: ANIM.getDuration('header') * 0.4,
        ease: ANIM.eases.smooth,
        onStart: () => console.log('[animations] Pile word', index, 'animation started'),
        onComplete: () => console.log('[animations] Pile word', index, 'animation completed')
      }, index * 0.05 + 0.1); // Start 100ms after timeline begins, with stagger
    });
  } else {
    console.log('[animations] No other words to animate');
  }
  
  console.log('[animations] Place flip animation created - duration:', tl.duration());
  
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
  }).then(() => {});
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
        onComplete: () => {
          console.log('[animations] Language transition completed');
          resolve();
        },
        onInterrupt: () => {
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
        onStart: () => console.log('[animations] Content fade out started'),
        onComplete: () => console.log('[animations] Content fade out completed')
      }, 0);

      // Phase 2: Apply language changes at the right time
      masterTl.call(() => {
        console.log('[animations] Applying language change to:', newLang);
        applyLanguage(newLang, true);
        renderHeader('place', false); // Don't animate header render during language switch
      }, ANIM.getDuration('fade'));

      // Phase 3: Animate header elements with Flip
      masterTl.call(() => {
        console.log('[animations] Starting header flip animation');
        
        // Animate the header elements with Flip
        const flipAnimation = Flip.from(flipState, {
          duration: ANIM.getDuration('header'),
          ease: ANIM.eases.flat,
          onStart: () => console.log('[animations] Header flip started'),
          onComplete: () => console.log('[animations] Header flip completed')
        });
        
        // Add the flip animation to the timeline
        masterTl.add(flipAnimation, ANIM.getDuration('fade') + 0.1);
      });

      // Phase 4: Fade content back in
      masterTl.to(content, {
        autoAlpha: 1,
        duration: ANIM.getDuration('fade'),
        ease: ANIM.eases.smooth,
        onStart: () => console.log('[animations] Content fade in started'),
        onComplete: () => console.log('[animations] Content fade in completed')
      }, ANIM.getDuration('fade') + ANIM.getDuration('header'));

      console.log('[animations] Language transition timeline created - duration:', masterTl.duration());
      
    } catch (error) {
      console.error('[animations] Language transition setup error:', error);
      reject(error);
    }
  });
}