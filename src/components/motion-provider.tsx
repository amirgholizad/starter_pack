"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Makes every framer-motion animation honor prefers-reduced-motion: transforms and layout
 * animations jump to their end state, opacity still fades. GSAP handles the same preference
 * itself, through `motionOk` in lib/gsap.ts.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
