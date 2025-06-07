document.addEventListener("DOMContentLoaded", function () {
  // Enhanced script using document.referrer with improved edge case handling
  console.debug("Language transition script loaded.");

  try {
    // 1. Get the language of the CURRENT page from the body class (e.g., 'en' or 'he')
    const bodyClass = document.body.className;
    const currentLangMatch = bodyClass.match(/lang--(\w+)/);
    const currentLang = currentLangMatch ? currentLangMatch[1] : null;

    console.debug("Current page language:", currentLang);
    if (!currentLang) {
      console.warn("No language class found on body.");
      return;
    }

    // 2. Get the previous page URL (referrer)
    const referrerUrl = document.referrer;
    console.debug("Referrer URL:", referrerUrl);

    // 3. Only proceed if referrer exists and is from same origin
    if (referrerUrl && new URL(referrerUrl).hostname === window.location.hostname) {
      const previousPath = new URL(referrerUrl).pathname;
      let previousLang = null;
      const previousLangMatch = previousPath.match(/^\/([a-z]{2})\//);

      if (previousLangMatch) {
        previousLang = previousLangMatch[1];
      } else {
        // If no language prefix, assume it's English (default)
        previousLang = "en";
        console.debug("No lang prefix found in referrer path, assuming default:", previousLang);
      }

      // 4. Handle the edge case: previous page was root "/" (no lang prefix)
      if (!previousLang && previousPath === '/') {
        const defaultLang = "en"; // Set your actual default language here
        previousLang = defaultLang;
        console.debug("Assuming default language for homepage referrer:", previousLang);
      }

      console.debug("Previous page language:", previousLang);

      // 5. Compare and apply animation if language has changed
      if (previousLang && currentLang !== previousLang) {
        console.debug("Language change detected! Triggering animation.");
        document.body.classList.add("page-is-changing-language");
      } else {
        console.debug("Same language or no detectable language change. No animation triggered.");
      }
    } else {
      console.debug("No valid same-origin referrer. Skipping animation.");
    }
  } catch (error) {
    console.error("Error in language transition script:", error);
  }
});