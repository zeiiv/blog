
// Unified vendor file for all external libraries
import gsap from "https://cdn.skypack.dev/gsap@3.12.5";
import { Flip } from "https://cdn.skypack.dev/gsap@3.12.5/Flip";
import barba from "https://cdn.skypack.dev/@barba/core@2.10.3";

// Register GSAP plugins
gsap.registerPlugin(Flip);

// Export all vendor libraries
export default gsap;
export { Flip, barba };