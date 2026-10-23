// shot.mjs — full-page screenshot of a page the local server is serving, for impeccable's
// finish review (.impeccable/review/desktop.png + mobile.png). snap.sh can't do this: its
// screenshot service can't reach localhost.
//
// Capture the production build (`npm run build && npm run start`); dev mode paints Next's dev
// indicator into the shot. The page is scrolled top to bottom first: a full-page capture never
// scrolls, so every <Reveal> below the fold would otherwise stay at opacity 0. It captures with
// prefers-reduced-motion: reduce, so GSAP scroll effects (gated on `motionOk` in lib/gsap.ts)
// show their static layout rather than the scroll-0 frame — an empty pin spacer, a scrub at 0%.
//
// Usage:
//   node scripts/shot.mjs <url> <output.png> [width]
//   node scripts/shot.mjs http://localhost:3000 .impeccable/review/desktop.png 1440
//   node scripts/shot.mjs http://localhost:3000 .impeccable/review/mobile.png 390
//
// Drives the installed Google Chrome through playwright-core (no browser download). Set
// CHROME_PATH to use another Chrome/Chromium binary.
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { chromium } from "playwright-core";

const [url, out, widthArg = "1440"] = process.argv.slice(2);
const width = Number(widthArg);
if (!url || !out || !Number.isInteger(width) || width <= 0) {
  console.error("usage: node scripts/shot.mjs <url> <output.png> [width]");
  process.exit(2);
}
const mobile = width < 768;

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" }
);
try {
  const page = await browser.newPage({
    viewport: { width, height: mobile ? 844 : 900 },
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: "reduce",
  });
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(async () => {
    const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await pause(120);
    }
    window.scrollTo(0, 0);
    // Lazy images the scroll requested, capped so a broken one can't hang the capture.
    await Promise.race([
      Promise.all([...document.images].map(img => img.decode().catch(() => {}))),
      pause(5000),
    ]);
    await document.fonts.ready;
  });
  // Let the last reveal finish (Reveal animates for 0.6s).
  await page.waitForTimeout(800);
  await mkdir(dirname(out), { recursive: true });
  await page.screenshot({ path: out, fullPage: true });
  console.log(out);
} finally {
  await browser.close();
}
