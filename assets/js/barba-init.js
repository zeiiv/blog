// Make sure Barba is loaded
if (typeof barba !== 'undefined') {
  barba.init({
    views: [
      {
        namespace: 'home',
        afterEnter() {
          console.log('[barba] home view entered');
          // Optional: if you need to refresh the header in a specific way on homepage
          // wordplay.refresh();
        }
      }
    ],
    transitions: [
      {
        name: 'default-transition',
        leave({ current }) {
          return gsap.to(current.container, { opacity: 0, duration: 0.5, ease: 'power2.inOut' });
        },
        enter({ next }) {
          gsap.set(next.container, { opacity: 0, });
          return gsap.to(next.container, { opacity: 1, duration: 0.5, ease: 'power2.out' });
        }
      }
    ]
  });
  console.log('[barba-init] Barba initialized. Transitions:', barba.transitions);
  
  // beforeEnter hook removed: no longer setting position: fixed on next.container

  // Global hook: cleanup after transition and restart header animations
  barba.hooks.afterEnter(({ next }) => {
    gsap.set(next.container, { clearProps: 'all' });

    // Header is persistent, so always re-init wordplay animations
    console.log('[barba] Refreshing persistent wordplay header...');
    if (typeof initWordplayHeader === 'function') {
      initWordplayHeader();
    }
  });
}