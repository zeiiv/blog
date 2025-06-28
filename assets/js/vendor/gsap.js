import gsap from "https://cdn.skypack.dev/gsap@3.12.5";
import { Flip } from "https://cdn.skypack.dev/gsap@3.12.5/Flip";

// Register the Flip plugin
gsap.registerPlugin(Flip);

// Export GSAP as the default and Flip as a named export
export default gsap;
export { Flip };