document.addEventListener("DOMContentLoaded", function() {
  // FINAL SCRIPT using document.referrer
  // To debug, open your browser's developer console (F12).
  console.log("Referrer animation script loaded.");

  try {
    // 1. Get the language of the CURRENT page from the body class (e.g., 'en' or 'he')
    const currentLangMatch = document.body.className.match(/lang--(\w+)/);
    if (!currentLangMatch) {
      console.error("Debug: Could not find language class on current page body.");
      return;
    }
    const currentLang = currentLangMatch[1];
    console.log("Debug: Current page language is '" + currentLang + "'.");

    // 2. Get the URL of the PREVIOUS page
    const referrerUrl = document.referrer;
    console.log("Debug: User came from URL: '" + referrerUrl + "'.");

    // 3. Only proceed if the user came from a page on the same website
    if (referrerUrl && new URL(referrerUrl).hostname === window.location.hostname) {

      // 4. Extract the language from the PREVIOUS page's URL path.
      // Your URLs look like '.../en/page' or '.../he/page'.
      // This regex looks for '/en/' or '/he/' at the start of the path.
      const previousLangMatch = new URL(referrerUrl).pathname.match(/^\/([a-z]{2})\//);

      if (previousLangMatch) {
        const previousLang = previousLangMatch[1];
        console.log("Debug: Previous page language was '" + previousLang + "'.");

        // 5. Compare and apply animation if they are different
        if (currentLang !== previousLang) {
          console.log("SUCCESS: Language changed! Applying fade-in animation.");
          document.body.classList.add('page-is-changing-language');
        } else {
          console.log("Debug: Language is the same. No animation needed.");
        }
      } else {
        // This happens if the previous page was the homepage (e.g., '/'), which has no /en/ or /he/ prefix.
        // We can assume a switch from the default language if the current lang is not default.
        const defaultLang = "en"; // Change this if your default language is different
        if (currentLang !== defaultLang) {
           console.log("SUCCESS: Moved from homepage to non-default language. Applying fade-in animation.");
           document.body.classList.add('page-is-changing-language');
        } else {
          console.log("Debug: Could not determine language from referrer path, assuming no change.");
        }
      }
    } else {
      console.log("Debug: No valid referrer. This is an external entry or first visit. No animation.");
    }
  } catch (e) {
    console.error("An error occurred in the animation script:", e);
  }
});