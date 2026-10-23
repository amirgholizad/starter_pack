import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// The one place GSAP plugins are registered. Client components import gsap, ScrollTrigger, and
// useGSAP from here; a build that needs another plugin (SplitText, DrawSVG, …) registers it in
// this call too, never inside a component.
gsap.registerPlugin(useGSAP, ScrollTrigger);

/** gsap.matchMedia() condition for scroll effects; reduced-motion visitors get the static page. */
export const motionOk = "(prefers-reduced-motion: no-preference)";

export { gsap, ScrollTrigger, useGSAP };
