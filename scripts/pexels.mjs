// pexels.mjs — licensed stock photos and video from Pexels for the media slots a client's own
// assets don't cover. The build agent searches, looks at the contact sheet, then downloads its
// pick into public/ (self-hosted, never hotlinked). Each download carries its origin inside the
// file (impeccable's provenance rule) and gets a row in the client's stock-media log.
//
// Pexels License: free for commercial use, attribution not required. It forbids implying that
// a pictured person endorses the business, and AGENTS.md forbids passing stock media off as
// the client's own people, premises, or work.
//
// Usage:
//   node scripts/pexels.mjs search "<query>" [sheet.png] [--orientation landscape|portrait|square]
//                                            [--color <name|#hex>] [--count 12] [--page 1]
//   node scripts/pexels.mjs get <photo-id> <out.jpg> [--width 2400] [--log <stock-photos.md>]
//   node scripts/pexels.mjs search-video "<query>" [sheet.png] [--orientation …] [--count 12]
//                                                  [--page 1]
//   node scripts/pexels.mjs get-video <video-id> <out.mp4> [--scrub] [--width 1920|1280]
//                                     [--start <s>] [--duration <s>] [--log <stock-photos.md>]
//
//   node scripts/pexels.mjs search "sourdough loaf on a cooling rack" --orientation landscape
//   node scripts/pexels.mjs get 10481790 public/images/stock/hero.jpg \
//     --log clients/<slug>/stock-photos.md
//   node scripts/pexels.mjs get-video 35371141 public/videos/stock/hero.mp4 --scrub \
//     --start 2 --duration 6 --log clients/<slug>/stock-photos.md
//
// search prints one line per result and renders a numbered contact sheet (default: the OS temp
// dir) through the installed Chrome, as shot.mjs does; Read the sheet to choose. search-video's
// sheet shows four frames across each clip, so the motion can be judged without downloading it.
// Without Chrome it saves the previews one file each instead.
//
// get-video needs ffmpeg past the raw download: it writes the origin into the mp4's metadata
// (impeccable's embed-prompt reads images only), moves the index up front for streaming, and
// saves the first frame as <out>.jpg — the poster, the reduced-motion still, and the file the
// provenance scan reads. --scrub re-encodes for a GSAP ScrollTrigger scrub: no audio, 1280
// wide unless --width says otherwise, and dense keyframes so seeking to any scroll position is
// instant. --start/--duration trim the clip (seconds); the file grows with every second kept.
//
// The key is PEXELS_SEARCH_API_KEY, read from the environment, then .env.local, then .env. It
// is a build-time tool key: never prefix it NEXT_PUBLIC_; the site never calls Pexels, so
// Vercel doesn't need it.
import { execFile } from "node:child_process";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const impeccable = join(root, ".claude/skills/impeccable/scripts/impeccable");
const API = "https://api.pexels.com";
const USAGE = `usage:
  node scripts/pexels.mjs search "<query>" [sheet.png] [--orientation landscape|portrait|square]
                                           [--color <name|#hex>] [--count 12] [--page 1]
  node scripts/pexels.mjs get <photo-id> <out.jpg> [--width 2400] [--log <stock-photos.md>]
  node scripts/pexels.mjs search-video "<query>" [sheet.png] [--orientation …] [--count 12]
                                                 [--page 1]
  node scripts/pexels.mjs get-video <video-id> <out.mp4> [--scrub] [--width 1920|1280]
                                    [--start <s>] [--duration <s>] [--log <stock-photos.md>]`;
const run = promisify(execFile);

function fail(message, code = 1) {
  console.error(code === 2 ? message : `pexels.mjs: ${message}`);
  process.exit(code);
}

const [command, ...rest] = process.argv.slice(2);
const args = [];
const flags = {};
for (let i = 0; i < rest.length; i++) {
  if (!rest[i].startsWith("--")) args.push(rest[i]);
  else if (rest[i] === "--scrub") flags.scrub = true;
  else flags[rest[i].slice(2)] = rest[++i];
}
const commands = { search, get, "search-video": searchVideo, "get-video": getVideo };
if (!Object.hasOwn(commands, command ?? "")) fail(USAGE, 2);

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

// One tile per result: a photo, or a strip of frames across a clip.
const sheetHtml = (tiles, { columns, height }) => `<!doctype html><style>
  body { margin: 0; padding: 16px; display: grid; grid-template-columns: repeat(${columns}, 1fr);
    gap: 16px; background: #f4f4f4; color: #111; font: 13px/1.3 system-ui, sans-serif; }
  figure { margin: 0; }
  div { display: flex; gap: 2px; }
  img { display: block; flex: 1; min-width: 0; height: ${height}px; object-fit: contain;
    background: #ddd; }
  figcaption { margin-top: 6px; }
  b { font-size: 16px; }
</style>${tiles
  .map(
    (t, i) =>
      `<figure><div>${t.frames.map(src => `<img src="${src}">`).join("")}</div><figcaption><b>#${i + 1}</b> ${t.caption}</figcaption></figure>`
  )
  .join("")}`;

async function contactSheet(tiles, out, layout) {
  await mkdir(dirname(out), { recursive: true });
  try {
    const { chromium } = await import("playwright-core");
    const browser = await chromium.launch(
      process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" }
    );
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 100 } });
      // "load" waits for every thumbnail.
      await page.setContent(sheetHtml(tiles, layout), { waitUntil: "load", timeout: 30000 });
      await page.screenshot({ path: out, fullPage: true });
    } finally {
      await browser.close();
    }
    console.log(`contact sheet: ${out}`);
  } catch (err) {
    const dir = out.replace(/\.png$/i, "");
    await mkdir(dir, { recursive: true });
    await Promise.all(
      tiles.map((t, i) => download(t.frames[0], join(dir, `${i + 1}-${t.id}.jpg`)))
    );
    console.log(`no contact sheet (${err.message.split("\n")[0]}); previews: ${dir}/`);
  }
}

// The flags both searches share, validated; returns the query string to send.
function searchParams() {
  const [query] = args;
  const count = Number(flags.count ?? 12);
  const page = Number(flags.page ?? 1);
  if (!query || !(count >= 1 && count <= 80) || !(page >= 1)) fail(USAGE, 2);
  if (flags.orientation && !["landscape", "portrait", "square"].includes(flags.orientation)) {
    fail(USAGE, 2);
  }
  const params = new URLSearchParams({ query, per_page: String(count), page: String(page) });
  if (flags.orientation) params.set("orientation", flags.orientation);
  return params;
}

function sheetPath(params) {
  const slug = params
    .get("query")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return args[1] ?? join(tmpdir(), "pexels", `${slug}-p${params.get("page")}.png`);
}

async function search() {
  const params = searchParams();
  if (flags.color) params.set("color", flags.color);

  const { photos, total_results: total } = await pexels(`/v1/search?${params}`);
  const query = params.get("query");
  if (!photos.length) fail(`no results for "${query}"; try fewer words or a plainer object`);
  console.log(`${total} results for "${query}" (page ${params.get("page")}):`);
  photos.forEach((p, i) =>
    console.log(
      `#${i + 1}  ${p.id}  ${p.width}×${p.height}  ${p.avg_color}  ${p.alt || "(no alt)"}`
    )
  );
  const tiles = photos.map(p => ({
    id: p.id,
    caption: `${p.id} · ${p.width}×${p.height}`,
    frames: [p.src.medium],
  }));
  await contactSheet(tiles, sheetPath(params), { columns: 4, height: 220 });
}

// Video results have no alt text; the page URL's slug is the closest thing to a description.
const describe = video => video.url.match(/\/video\/(.+)-\d+\/?$/)?.[1].replaceAll("-", " ") ?? "";

async function searchVideo() {
  const params = searchParams();
  const { videos, total_results: total } = await pexels(`/videos/search?${params}`);
  const query = params.get("query");
  if (!videos.length) fail(`no results for "${query}"; try fewer words or a plainer motion`);
  console.log(`${total} results for "${query}" (page ${params.get("page")}):`);
  videos.forEach((v, i) =>
    console.log(
      `#${i + 1}  ${v.id}  ${v.width}×${v.height}  ${v.duration}s  ${describe(v) || "(no description)"}`
    )
  );
  const tiles = videos.map(v => {
    const pictures = v.video_pictures.map(p => p.picture);
    return {
      id: v.id,
      caption: `${v.id} · ${v.width}×${v.height} · ${v.duration}s`,
      // First, two middles, last: enough to read the camera move.
      frames: pictures.length
        ? [0, 1, 2, 3].map(n => pictures[Math.round((n * (pictures.length - 1)) / 3)])
        : [v.image],
    };
  });
  await contactSheet(tiles, sheetPath(params), { columns: 2, height: 120 });
}

async function embedOrigin(image, origin) {
  try {
    await run(impeccable, ["embed-prompt", image, "--prompt", origin]);
  } catch (err) {
    console.error(`pexels.mjs: provenance not embedded (${err.message.split("\n")[0]}); run:`);
    console.error(`  ${impeccable} embed-prompt ${image} --prompt "${origin}"`);
  }
}

async function logRow(log, out, source) {
  const header = `# Stock media (Pexels)

Self-hosted under the Pexels License: free for commercial use, attribution not required.
Swap each for the client's own photography or footage when it arrives.

| File | Pexels page | Creator | Pexels description |
| --- | --- | --- | --- |
`;
  const file = `\`${out}\``;
  const clean = text => (text || "").replaceAll("|", "/").replaceAll("\n", " ");
  const kept = (await readFile(log, "utf8").catch(() => header))
    .split("\n")
    .filter(line => !line.startsWith(`| ${file} |`)) // a re-download replaces its row
    .join("\n")
    .replace(/\n*$/, "\n");
  const row = `| ${file} | [${source.id}](${source.url}) | [${clean(source.creator)}](${source.creatorUrl}) | ${clean(source.description)} |\n`;
  await mkdir(dirname(log), { recursive: true });
  await writeFile(log, kept + row);
}

async function get() {
  const [id, out] = args;
  const width = Number(flags.width ?? 2400);
  if (!/^\d+$/.test(id ?? "") || !out || !(width > 0)) fail(USAGE, 2);
  if (!/\.jpe?g$/i.test(out))
    fail("output must be .jpg: Pexels serves JPEG (next/image re-encodes)");

  const photo = await pexels(`/v1/photos/${id}`);
  // Resized on Pexels' CDN, never past the original.
  const url = `${photo.src.original}?auto=compress&cs=tinysrgb&w=${Math.min(width, photo.width)}`;
  const type = await download(url, out);
  if (!type.startsWith("image/jpeg")) fail(`expected image/jpeg, got "${type}" for ${url}`);

  await embedOrigin(
    out,
    `origin: Pexels photo ${photo.id} by ${photo.photographer} (${photo.photographer_url}), ${photo.url}; Pexels License, free for commercial use`
  );
  if (flags.log) {
    await logRow(flags.log, out, {
      id: photo.id,
      url: photo.url,
      creator: photo.photographer,
      creatorUrl: photo.photographer_url,
      description: photo.alt,
    });
  }
  console.log(out);
  console.log(`Pexels alt (rewrite it for the page): ${photo.alt || "(none)"}`);
}

async function getVideo() {
  const [id, out] = args;
  const width = Number(flags.width ?? (flags.scrub ? 1280 : 1920));
  const trim = [];
  if (flags.start) trim.push("-ss", flags.start);
  if (flags.duration) trim.push("-t", flags.duration);
  if (!/^\d+$/.test(id ?? "") || !out || !(width > 0)) fail(USAGE, 2);
  if (![flags.start, flags.duration].every(s => s === undefined || Number(s) >= 0)) {
    fail(USAGE, 2);
  }
  if (!/\.mp4$/i.test(out)) fail("output must be .mp4");

  const video = await pexels(`/videos/videos/${id}`);
  // The widest mp4 rendition that fits, else the narrowest one there is. --scrub re-encodes,
  // so it starts from a sharper rendition and scales down to --width.
  const fits = flags.scrub ? Math.max(width, 1920) : width;
  const files = video.video_files
    .filter(f => f.file_type === "video/mp4" && f.width)
    .sort((a, b) => b.width - a.width);
  const file = files.find(f => f.width <= fits) ?? files.at(-1);
  if (!file) fail(`video ${id} has no mp4 rendition`);
  const raw = join(tmpdir(), "pexels", `${video.id}-${file.width}.mp4`);
  const type = await download(file.link, raw);
  if (!type.startsWith("video/")) fail(`expected video/mp4, got "${type}" for ${file.link}`);

  const origin = `origin: Pexels video ${video.id} by ${video.user.name} (${video.user.url}), ${video.url}; Pexels License, free for commercial use`;
  const poster = out.replace(/\.mp4$/i, ".jpg");
  // Scrub: ~5 MB for 10 s of 1280-wide water (the hardest case), and a keyframe every 6
  // frames keeps each seek to a handful of decoded frames.
  const encode = flags.scrub
    ? [
        ...["-an", "-vf", `scale='min(iw,${width})':-2`, "-c:v", "libx264", "-preset", "slow"],
        ...["-crf", "28", "-pix_fmt", "yuv420p", "-g", "6"],
      ]
    : ["-c", "copy"];
  if ((flags.start || flags.duration) && !flags.scrub) {
    console.error("pexels.mjs: without --scrub the trim snaps to the source's keyframes");
  }
  let hasPoster = false;
  await mkdir(dirname(out), { recursive: true });
  try {
    if (flags.scrub) console.error("pexels.mjs: re-encoding for scrub, this can take a minute…");
    await run("ffmpeg", [
      ...["-y", "-v", "error", ...trim, "-i", raw, ...encode, "-map_metadata", "-1"],
      ...["-metadata", `comment=${origin}`, "-movflags", "+faststart", out],
    ]);
    await run("ffmpeg", ["-y", "-v", "error", "-i", out, "-frames:v", "1", "-q:v", "3", poster]);
    await embedOrigin(poster, origin);
    hasPoster = true;
  } catch (err) {
    if (err.code !== "ENOENT") fail(`ffmpeg failed: ${(err.stderr || err.message).trim()}`);
    if (flags.scrub || trim.length) fail("--scrub and trimming need ffmpeg (brew install ffmpeg)");
    await copyFile(raw, out);
    console.error("pexels.mjs: no ffmpeg, so saved as downloaded: no origin metadata, no poster");
  }
  if (flags.log) {
    await logRow(flags.log, out, {
      id: video.id,
      url: video.url,
      creator: video.user.name,
      creatorUrl: video.user.url,
      description: describe(video),
    });
  }
  const { size } = await stat(out);
  console.log(
    `${out} (${(size / 1e6).toFixed(1)} MB, from the ${file.width}×${file.height} rendition)`
  );
  if (hasPoster) console.log(`poster: ${poster}`);
  console.log(`Pexels description (rewrite it for the page): ${describe(video) || "(none)"}`);
}

try {
  await commands[command]();
} catch (err) {
  fail(err.message);
}
