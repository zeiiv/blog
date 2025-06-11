
  document.addEventListener('DOMContentLoaded', () => {
    // The base URL of your site from the Jekyll config.
    const BASE_URL = '/blog';

    // This is our custom transition that uses the GSAP animation.
    const wordSwapTransition = {
      name: 'word-swap',
      // We are NOT using `sync: true` for more control over the leave/enter flow.

      leave(data) {
        // We only run this custom animation if a link inside `.wordpile` was clicked.
        if (data.trigger.closest && data.trigger.closest('.wordpile')) {
          console.log('--- Triggering custom word-swap transition ---');
          
          // Start the full animation, but DO NOT wait for it to finish.
          // This allows the animation to play out as a visual "send-off".
          createWordSwapAnimation(data.trigger);

          // IMPORTANT: To make the page load feel faster, we only wait for a very
          // short time before telling Barba to proceed with fetching the next page.
          // The full visual animation will continue playing in the background.
          return new Promise(resolve => {
            // Adjust this timeout to control the delay before the next page starts loading.
            // 200ms is a good starting point.
            setTimeout(resolve, 200);
          });
        }
        
        // For all other links, do nothing and let Barba perform its default transition.
        console.log('--- Triggering default transition ---');
      },
      
      enter(data) {
        console.log('--- Entering new page ---');
        // Add a simple fade-in for the new content to make the entry smooth.
        gsap.from(data.next.container, {
          opacity: 0,
          duration: 0.4,
          delay: 0.1 // A slight delay to ensure the leave animation is well underway.
        });
      }
    };

    // Initialize Barba with our custom transition and URL-fixing logic.
    barba.init({
      debug: true, // Set to false for production
      transitions: [
        wordSwapTransition
      ],
      // This custom request logic fixes the "Fetch error" by ensuring the baseurl is correct.
      request: (url, { trigger, method, headers }) => {
        const urlObject = new URL(url);
        if (!urlObject.pathname.startsWith(BASE_URL)) {
          const correctedPath = BASE_URL + urlObject.pathname;
          console.warn(`[barba] URL Corrected: from ${urlObject.pathname} to ${correctedPath}`);
          return fetch(correctedPath, { method, headers });
        }
        return fetch(url, { method, headers });
      }
    });

    // This hook runs after Barba has loaded the new page content.
    barba.hooks.after(() => {
      // Clean up the 'clicked-once' class from any links that might have it.
      document.querySelectorAll('.clicked-once').forEach(el => el.classList.remove('clicked-once'));
    });
  });