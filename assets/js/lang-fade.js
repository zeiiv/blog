document.addEventListener("DOMContentLoaded", function() {
  // This script uses the permalink for both the current and previous pages
  // to detect a language change, as you suggested.
  console.log("URL-based language animation script loaded.");

  try {
    // --- Determine Current Language from its URL ---
    let currentLang = window.location.pathname.startsWith('/he/') ? 'he' : 'en';
    console.log("Debug: Current language (from URL) is '" + currentLang + "'.");


    // --- Determine Previous Language from its Referrer URL ---
    const referrerUrl = document.referrer;
    console.log("Debug: User came from URL: '" + referrerUrl + "'.");

    // Only proceed if the user is coming from another page on the same website.
    if (referrerUrl && new URL(referrerUrl).hostname === window.location.hostname) {
      const referrerPath = new URL(referrerUrl).pathname;
      let previousLang = referrerPath.startsWith('/he/') ? 'he' : 'en';
      console.log("Debug: Previous page language (from URL) was '" + previousLang + "'.");

      // --- Compare and Animate if Needed ---
      if (currentLang !== previousLang) {
        console.log("SUCCESS: Language changed! Applying fade-in animation.");
        document.body.classList.add('page-is-changing-language');
      } else {
        console.log("Debug: Language is the same. No animation needed.");
      }

    } else {
      console.log("Debug: No valid referrer. This is an external entry or first visit. No animation.");
    }

  } catch (e) {
    console.error("An error occurred in the animation script:", e);
  }
});