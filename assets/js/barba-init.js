/****
 * barba-init.js
 * Handles Barba.js page transitions and persistent header reinitialization.
 */

// Make sure Barba is loaded
if (typeof barba !== 'undefined') {
  barba.init({
    views: [
      {
        namespace: 'home',
        afterEnter() {
          console.log('[barba] home view entered');
          // Optional: you can add view-specific behavior here
        }
      }
    ],
    transitions: [
      {
        name: 'default-transition',
        leave({ current }) {
          return gsap.to(current.container, {
            opacity: 0,
            duration: 0.5,
            ease: 'power2.inOut'
          });
        },
        enter({ next }) {
          gsap.set(next.container, { opacity: 0 });
          return gsap.to(next.container, {
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out'
          });
        }
      }
    ]
  });

  console.log('[barba-init] Barba initialized. Transitions:', barba.transitions);

  // Cleanup GSAP inline styles and re-initialize wordplay header after each enter
  barba.hooks.afterEnter(({ next }) => {
    gsap.set(next.container, { clearProps: 'all' });

    console.log('[barba] Refreshing persistent wordplay header...');
    if (typeof initWordplayHeader === 'function') {
      initWordplayHeader();
    }
  });

  // Finalize layout or run post-load animations
  barba.hooks.after(() => {
    requestAnimationFrame(() => {
      console.log('[barba] Page fully swapped. Layout finalized.');
    });
  });
}