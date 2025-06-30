import { animateLanguageTransition } from "./animations.js";
import { SELECTORS, STORAGE_KEYS, LANG_CLASSES } from "./config.js";
import { animManager } from "./anim-manager.js";

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
            // Clean up any ongoing animations before language switch
            animManager.killAll();
            
            const newLang = currentLang === 'en' ? 'he' : 'en';
            animateLanguageTransition({
                newLang,
                applyLanguage,
                renderHeader
            }).catch(err => {
                console.error("[wordplay] language transition error:", err);
            });
        } catch (error) {
            console.error("[wordplay] Error toggling language:", error);
        }
    };

    langToggle.addEventListener('click', () => toggleLanguage());

    // Initialize language on load
    applyLanguage(currentLang, false);
};