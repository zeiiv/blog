/**
 * -File: lang-switch.js
 * -Summary: Manages the language switching functionality for the bilingual website.
 * -Description: Handles user interaction for toggling between English and Hebrew,
 * persisting the choice in localStorage, and setting appropriate document attributes.
 */

document.addEventListener('DOMContentLoaded', function () {

    const body = document.body;
    const html = document.documentElement;
    const header = document.getElementById('wordplay-header');

    // Edge Case: If the core elements aren't found, the script can't run.
    if (!body || !html) {
        console.error('lang-switch.js: Could not find the <body> or <html> element. Script cannot proceed.');
        return;
    }

    /**
     * Safely sets an item in localStorage, handling potential browser restrictions.
     * param {string} key The key of the item to set.
     * param {string} value The value to set.
     */
    function setStoredLanguage(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.error('lang-switch.js: Could not access localStorage. Language preference will not be saved.', e);
        }
    }

    /**
     * Safely retrieves an item from localStorage.
     * param {string} key The key of the item to retrieve.
     * returns {string|null} The value of the item, or null if it cannot be accessed.
     */
    function getStoredLanguage(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.error('lang-switch.js: Could not access localStorage.', e);
            return null;
        }
    }

    /**
     * Switches the site's language by updating document classes and attributes.
     * param {'en' | 'he'} lang The language to switch to ('en' or 'he').
     */
    function switchLanguage(lang) {
        const isHebrew = lang === 'he';
        
        // Use the second argument of toggle to force add or remove the class.
        body.classList.toggle('show-hebrew', isHebrew);
        html.setAttribute('lang', isHebrew ? 'he' : 'en');
        html.setAttribute('dir', isHebrew ? 'rtl' : 'ltr');
        
        setStoredLanguage('language', isHebrew ? 'he' : 'en');
    }

    /**
     * Handles all click events within the header, delegating actions based on the clicked link.
     * param {MouseEvent} e The click event.
     */
    function handleHeaderClick(e) {
        const link = e.target.closest('a');

        // If the click wasn't on a link, do nothing.
        if (!link) {
            return;
        }

        // If the click was on the language toggle, switch the language.
        if (link.id === 'lang-toggle-link') {
            e.preventDefault(); // Prevent the link from navigating.
            const currentLang = body.classList.contains('show-hebrew') ? 'en' : 'he';
            switchLanguage(currentLang);
        }
        // For all other links, do nothing and allow the default browser navigation to occur.
    }

    // --- Initialization ---

    // Attach the single, smart listener to the header.
    if (header) {
        header.addEventListener('click', handleHeaderClick);
    } else {
        // This is a critical error, as the header is essential for navigation.
        console.error('lang-switch.js: CRITICAL - Header element with ID "wordplay-header" was not found. Navigation and language switching will not work.');
    }

    // Set the initial language on page load based on saved preference or default to English.
    const savedLang = getStoredLanguage('language') || 'en';
    switchLanguage(savedLang);
});