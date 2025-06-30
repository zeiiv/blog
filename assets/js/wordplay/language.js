import { barba } from "./vendor.js";
import { SELECTORS, STORAGE_KEYS, LANG_CLASSES } from "./config.js";
import { animManager } from "./anim-manager.js";
import { animateLanguageToggle, animateLanguageDirectionChange } from "./animations.js";

const html = document.documentElement;
const htmlClasses = html.classList;
const langToggle = document.querySelector(SELECTORS.langToggle);

let currentLang;

export const getCurrentLang = () => currentLang;

export const initLanguageSwitcher = renderHeader => {

    // --- Language Switching Functions --
    if (!langToggle) return;
    // Initialize from existing body class or storage
    currentLang = htmlClasses.contains(LANG_CLASSES.he)
        ? 'he'
        : localStorage.getItem(STORAGE_KEYS.lang) || 'en';

    const applyLanguage = (lang, save) => {
        try {
            console.log(`Setting <html> lang to ${lang}`);
            currentLang = lang;

            // toggle HTML classes for immediate root-level styling
            htmlClasses.toggle('lang--he', lang === 'he');
            htmlClasses.toggle('lang--en', lang === 'en');

            // Set both the attribute and the property on <html>
            html.setAttribute('lang', lang);
            html.lang = lang;

            // Set direction on <html>
            const dir = lang === 'he' ? 'rtl' : 'ltr';
            html.setAttribute('dir', dir);

            if (save) {
                try {
                    localStorage.setItem(STORAGE_KEYS.lang, lang);
                } catch (error) {
                    console.warn("[wordplay] Could not save language to localStorage:", error);
                }
            }

            window.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { language: lang }
            }));
        } catch (error) {
            console.error("[wordplay] Error applying language:", error);
        }
    };

    const toggleLanguage = () => {
        try {
            const newLang = currentLang === 'en' ? 'he' : 'en';
            
            console.log('[language] Starting language direction change animation for:', newLang);
            
            // Block interactions during language change
            const placeZone = document.querySelector(SELECTORS.placeZone);
            const pinnedZone = document.querySelector(SELECTORS.pinnedZone);
            const pileZone = document.querySelector(SELECTORS.pileZone);
            const blockElements = [langToggle, placeZone, pinnedZone, pileZone];
            
            // Start language toggle button animation
            const currentLangToggle = document.querySelector(SELECTORS.langToggle);
            if (currentLangToggle) {
                animateLanguageToggle(currentLangToggle);
            }
            
            // Use the new comprehensive direction change animation
            const directionAnimation = animateLanguageDirectionChange(() => {
                // This callback applies the language change and re-renders header
                console.log('[language] Applying language and direction change');
                applyLanguage(newLang, true);
                renderHeader('place', false); // Re-render header to apply new direction
            });
            
            // Register the animation and add coordinated navigation
            if (directionAnimation) {
                animManager.registerTimeline(directionAnimation);
                
                // Add CSS class to persist animation across page change
                const headerElement = document.querySelector('#wordplay-header');
                if (headerElement) {
                    headerElement.classList.add('wordplay-animating');
                    console.log('[language] Added wordplay-animating class for persistence');
                }
                
                // Start coordinated navigation during animation (like pile clicks)
                setTimeout(() => {
                    console.log('[language] Starting coordinated navigation during direction animation');
                    
                    // Add safety flag to prevent rapid navigation
                    sessionStorage.setItem('wordplay-navigating', Date.now().toString());
                    
                    if (barba && typeof barba.go === 'function') {
                        try {
                            console.log('[language] Barba navigation starting for language change');
                            barba.go(window.location.href); // Reload current page
                        } catch (error) {
                            console.error('[language] Barba failed, using fallback:', error);
                            setTimeout(() => window.location.reload(), 200);
                        }
                    } else {
                        console.warn('[language] Barba not available, using direct reload');
                        setTimeout(() => window.location.reload(), 200);
                    }
                }, 150); // Same timing as other coordinated transitions
                
                // Clean up on animation completion
                directionAnimation.eventCallback("onComplete", function() {
                    console.log('[language] Direction animation completed, cleaning up');
                    if (headerElement && headerElement.classList.contains('wordplay-animating')) {
                        headerElement.classList.remove('wordplay-animating');
                        console.log('[language] Removed wordplay-animating class on completion');
                    }
                });
            }
            
        } catch (error) {
            console.error("[wordplay] Error toggling language:", error);
        }
    };

    langToggle.addEventListener('click', () => toggleLanguage());

    // Initialize language on load
    applyLanguage(currentLang, false);
};