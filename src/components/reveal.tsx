"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** vertical offset in px to animate from */
  y?: number;
}

/**
 * Scroll-reveal wrapper. Pairs with the <noscript> fallback in app/layout.tsx —
 * see the comment on `data-reveal` below. Don't use raw `whileInView` with an
 * `opacity: 0` initial state anywhere else without that fallback.
 */
export function Reveal({ children, className, delay = 0, y = 24 }: RevealProps) {
  return (
    <motion.div
      // Marks the element for the no-JS fallback style in the layout, which
      // forces it visible when framer-motion never runs (see app/layout.tsx).
      // Without it, every revealed section sits at opacity:0 with JS blocked
      // and the page renders effectively blank.
      data-reveal
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
