import gsap from "./vendor/gsap.js";
import { Flip } from "./vendor/gsap.js";
import barba from "./vendor/barba.js";
import { SELECTORS, STORAGE_KEYS, LANG_CLASSES, ANIM } from "./config.js";
import { normalizeSlug }         from "./dom-helpers.js";
import { getPrevPinnedSlug, setPrevPinnedSlug } from "./header-render.js";

const placeZone   = document.querySelector(SELECTORS.placeZone);
const pinnedZone  = document.querySelector(SELECTORS.pinnedZone);
const pileZone    = document.querySelector(SELECTORS.pileZone);

const html        = document.documentElement;
const htmlClasses = html.classList;
const langToggle  = document.querySelector(SELECTORS.langToggle);

let currentLang;

export const getCurrentLang = () => currentLang;

export const initLanguageSwitcher = renderHeader => {

    // --- Language Switching Functions --
    if (!langToggle) return;
    // Initialize from existing body class or storage
    currentLang = htmlClasses.contains(LANG_CLASSES.he)
        ? 'he'
        : localStorage.getItem(STORAGE_KEYS.lang) || 'en';
    //applyLanguage(currentLang, false);
    langToggle.addEventListener('click', () => toggleLanguage());

    const toggleLanguage = () => {
        const newLang = currentLang === 'en' ? 'he' : 'en';
        // Fade out main content
        const content = document.querySelector(SELECTORS.container);
        gsap.to(content, {
            autoAlpha: 0,
            duration: 0.3,
            onComplete: () => {
                // Capture header state for Flip
                const flipState = Flip.getState([...placeZone.children, ...pinnedZone.children, ...pileZone.children, langToggle]);
                // Apply new language
                applyLanguage(newLang, true);
                // Animate header word positions via Flip
                Flip.from(flipState, { duration: ANIM.durations.header, ease: ANIM.eases.flat });
                // Animate the language toggle button with a pulse
                gsap.fromTo(langToggle,
                    { scale: 1.2 },
                    { scale: 1, duration: 0.3, ease: ANIM.eases.bounce }
                );
                // Fade main content back in
                gsap.to(content, { autoAlpha: 1, duration: 0.3 });
            }
        });
    };

    const applyLanguage = (lang, save) => {
        console.log(`Setting <html> lang to ${lang}`);
        currentLang = lang;

        // toggle HTML classes for immediate root-level styling
        htmlClasses.toggle('lang--he', lang === 'he');
        htmlClasses.toggle('lang--en', lang === 'en');

        // Set both the attribute and the property on <html>
        html.setAttribute('lang', lang);
        html.lang = lang;      // ensures the inspector updates

        // Set direction on <html>
        const dir = lang === 'he' ? 'rtl' : 'ltr';
        html.setAttribute('dir', dir);

        /* Re-evaluate matchMedia break-points because dir/language
           tweaks can change layout direction; GSAP 3.12 exposes
           mm.refresh() so mm.conditions stay accurate. 
        if (typeof mm.refresh === "function") {
            mm.refresh();
        }*/

        if (save) localStorage.setItem(STORAGE_KEYS.lang, lang);
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    };
};