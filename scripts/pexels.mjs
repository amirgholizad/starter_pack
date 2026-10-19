// pexels.mjs — licensed stock photos from Pexels for the image slots a client's own assets
// don't cover. The build agent searches, looks at the contact sheet, then downloads its pick
// into public/images/ (self-hosted, never hotlinked). Each download carries its origin inside
// the file (impeccable's provenance rule) and gets a row in the client's stock-photo log.
//
// Pexels License: free for commercial use, attribution not required. It forbids implying that
// a pictured person endorses the business, and AGENTS.md forbids passing a stock photo off as
// the client's own people, premises, or work.
//
// Usage:
//   node scripts/pexels.mjs search "<query>" [sheet.png] [--orientation landscape|portrait|square]
//                                            [--color <name|#hex>] [--count 12] [--page 1]
//   node scripts/pexels.mjs get <photo-id> <out.jpg> [--width 2400] [--log <stock-photos.md>]
//
//   node scripts/pexels.mjs search "sourdough loaf on a cooling rack" --orientation landscape
//   node scripts/pexels.mjs get 10481790 public/images/stock/hero.jpg \
//     --log clients/<slug>/stock-photos.md
//
// search prints one line per result and renders a numbered contact sheet (default: the OS temp
// dir) through the installed Chrome, as shot.mjs does; Read the sheet to choose. Without Chrome
// it saves the previews one file each instead.
//
// The key is PEXELS_SEARCH_API_KEY, read from the environment, then .env.local, then .env. It
// is a build-time tool key: never prefix it NEXT_PUBLIC_; the site never calls Pexels, so
// Vercel doesn't need it.
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const impeccable = join(root, ".claude/skills/impeccable/scripts/impeccable");
const API = "https://api.pexels.com/v1";
const USAGE = `usage:
  node scripts/pexels.mjs search "<query>" [sheet.png] [--orientation landscape|portrait|square]
                                           [--color <name|#hex>] [--count 12] [--page 1]
  node scripts/pexels.mjs get <photo-id> <out.jpg> [--width 2400] [--log <stock-photos.md>]`;

function fail(message, code = 1) {
  console.error(code === 2 ? message : `pexels.mjs: ${message}`);
  process.exit(code);
}

const [command, ...rest] = process.argv.slice(2);
const args = [];
const flags = {};
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith("--")) flags[rest[i].slice(2)] = rest[++i];
  else args.push(rest[i]);
}
if (command !== "search" && command !== "get") fail(USAGE, 2);

async function apiKey() {
  if (process.env.PEXELS_SEARCH_API_KEY) return process.env.PEXELS_SEARCH_API_KEY.trim();
  for (const file of [".env.local", ".env"]) {
    const text = await readFile(join(root, file), "utf8").catch(() => "");
    // Tolerates `export`, spaces around `=`, and quotes.
    const match = text.match(/^\s*(?:export\s+)?PEXELS_SEARCH_API_KEY\s*=\s*["']?([^"'\s#]+)/m);
    if (match) return match[1];
  }
  fail("PEXELS_SEARCH_API_KEY is not set (env, .env.local, or .env) — https://www.pexels.com/api/");
}
const key = await apiKey();

async function pexels(path) {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: key } });
  if (res.status === 401 || res.status === 403) fail("Pexels rejected PEXELS_SEARCH_API_KEY");
  if (res.status === 429) {
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    fail(`Pexels rate limit hit; resets ${reset ? new Date(reset * 1000).toISOString() : "later"}`);
  }
  if (!res.ok) fail(`Pexels API ${res.status} ${res.statusText} for ${path.split("?")[0]}`);
  const left = res.headers.get("x-ratelimit-remaining");
  if (left !== null && Number(left) < 100) console.error(`pexels.mjs: ${left} API requests left`);
  return res.json();
}

async function download(url, out) {
  const res = await fetch(url);
  if (!res.ok) fail(`download failed: ${res.status} ${url}`);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, Buffer.from(await res.arrayBuffer()));
  return res.headers.get("content-type") ?? "";
}

const sheetHtml = photos => `<!doctype html><style>
  body { margin: 0; padding: 16px; display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 16px; background: #f4f4f4; color: #111; font: 13px/1.3 system-ui, sans-serif; }
  figure { margin: 0; }
  img { display: block; width: 100%; height: 220px; object-fit: contain; background: #ddd; }
  figcaption { margin-top: 6px; }
  b { font-size: 16px; }
</style>${photos
  .map(
    (p, i) =>
      `<figure><img src="${p.src.medium}"><figcaption><b>#${i + 1}</b> ${p.id} · ${p.width}×${p.height}</figcaption></figure>`
  )
  .join("")}`;

async function contactSheet(photos, out) {
  await mkdir(dirname(out), { recursive: true });
  try {
    const { chromium } = await import("playwright-core");
    const browser = await chromium.launch(
      process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" }
    );
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 100 } });
      // "load" waits for every thumbnail.
      await page.setContent(sheetHtml(photos), { waitUntil: "load", timeout: 30000 });
      await page.screenshot({ path: out, fullPage: true });
    } finally {
      await browser.close();
    }
    console.log(`contact sheet: ${out}`);
  } catch (err) {
    const dir = out.replace(/\.png$/i, "");
    await mkdir(dir, { recursive: true });
    await Promise.all(
      photos.map((p, i) => download(p.src.medium, join(dir, `${i + 1}-${p.id}.jpg`)))
    );
    console.log(`no contact sheet (${err.message.split("\n")[0]}); previews: ${dir}/`);
  }
}

async function search() {
  const [query, sheetArg] = args;
  const count = Number(flags.count ?? 12);
  const page = Number(flags.page ?? 1);
  if (!query || !(count >= 1 && count <= 80) || !(page >= 1)) fail(USAGE, 2);
  if (flags.orientation && !["landscape", "portrait", "square"].includes(flags.orientation)) {
    fail(USAGE, 2);
  }
  const params = new URLSearchParams({ query, per_page: String(count), page: String(page) });
  if (flags.orientation) params.set("orientation", flags.orientation);
  if (flags.color) params.set("color", flags.color);

  const { photos, total_results: total } = await pexels(`/search?${params}`);
  if (!photos.length) fail(`no results for "${query}"; try fewer words or a plainer object`);
  console.log(`${total} results for "${query}" (page ${page}):`);
  photos.forEach((p, i) =>
    console.log(
      `#${i + 1}  ${p.id}  ${p.width}×${p.height}  ${p.avg_color}  ${p.alt || "(no alt)"}`
    )
  );
  const slug = query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  await contactSheet(photos, sheetArg ?? join(tmpdir(), "pexels", `${slug}-p${page}.png`));
}

async function logRow(log, photo, out) {
  const header = `# Stock photos (Pexels)

Self-hosted under the Pexels License: free for commercial use, attribution not required.
Swap each for the client's own photography when it arrives.

| File | Pexels photo | Photographer | Pexels alt |
| --- | --- | --- | --- |
`;
  const file = `\`${out}\``;
  const clean = text => (text || "").replaceAll("|", "/").replaceAll("\n", " ");
  const kept = (await readFile(log, "utf8").catch(() => header))
    .split("\n")
    .filter(line => !line.startsWith(`| ${file} |`)) // a re-download replaces its row
    .join("\n")
    .replace(/\n*$/, "\n");
  const row = `| ${file} | [${photo.id}](${photo.url}) | [${clean(photo.photographer)}](${photo.photographer_url}) | ${clean(photo.alt)} |\n`;
  await mkdir(dirname(log), { recursive: true });
  await writeFile(log, kept + row);
}

async function get() {
  const [id, out] = args;
  const width = Number(flags.width ?? 2400);
  if (!/^\d+$/.test(id ?? "") || !out || !(width > 0)) fail(USAGE, 2);
  if (!/\.jpe?g$/i.test(out))
    fail("output must be .jpg: Pexels serves JPEG (next/image re-encodes)");

  const photo = await pexels(`/photos/${id}`);
  // Resized on Pexels' CDN, never past the original.
  const url = `${photo.src.original}?auto=compress&cs=tinysrgb&w=${Math.min(width, photo.width)}`;
  const type = await download(url, out);
  if (!type.startsWith("image/jpeg")) fail(`expected image/jpeg, got "${type}" for ${url}`);

  const origin = `origin: Pexels photo ${photo.id} by ${photo.photographer} (${photo.photographer_url}), ${photo.url}; Pexels License, free for commercial use`;
  try {
    await promisify(execFile)(impeccable, ["embed-prompt", out, "--prompt", origin]);
  } catch (err) {
    console.error(`pexels.mjs: provenance not embedded (${err.message.split("\n")[0]}); run:`);
    console.error(`  ${impeccable} embed-prompt ${out} --prompt "${origin}"`);
  }
  if (flags.log) await logRow(flags.log, photo, out);
  console.log(out);
  console.log(`Pexels alt (rewrite it for the page): ${photo.alt || "(none)"}`);
}

try {
  await (command === "search" ? search() : get());
} catch (err) {
  fail(err.message);
}
