document.addEventListener("DOMContentLoaded", function () {
  // This script uses the permalink for both the current and previous pages
  // to detect a language change, as you suggested.
  try {
    // --- Determine Current Language from its URL ---
    let currentLang = window.location.pathname.startsWith('/he/') ? 'he' : 'en';
    // --- Determine Previous Language from its Referrer URL ---
    const referrerUrl = document.referrer;
    // Only proceed if the user is coming from another page on the same website.
    if (referrerUrl && new URL(referrerUrl).hostname === window.location.hostname) {
      const referrerPath = new URL(referrerUrl).pathname;
      let previousLang = referrerPath.startsWith('/he/') ? 'he' : 'en';
      // --- Compare and Animate if Needed ---
      if (currentLang !== previousLang) {
        document.body.classList.add('page-is-changing-language');
      } else {
      }
    } else {
    }
  } catch (e) {
  }
});