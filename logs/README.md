# Agent problem log

A running, append-only log of problems the pipeline agents (`intake`, `build`) hit — so
recurring failures become visible and fixable instead of being re-discovered every run.
**Agents append here; humans read here.**

Entries whose fix belongs upstream in the `starter_pack` template are collected as an ordered
work queue in [`starter-pack-backport.md`](starter-pack-backport.md).

## When to write an entry

Add an entry whenever you (an agent):

- **give up** on a step after your bounded retries (see the retry cap in `AGENTS.md`) — status `BLOCKED`;
- **worked around** a problem to keep going (e.g. built with a placeholder because an asset
  download failed) — status `WORKAROUND`;
- hit a **notable problem you recovered from** that is likely to recur (a screenshot service
  refusing a site, rclone unconfigured, a corrupted `node_modules`) — status `RESOLVED`.

Don't log routine, first-try successes. Log friction, not narration.

## Redaction — no PII or secrets

Reference the client by **slug only**. Never write emails, phone numbers, addresses, raw brief
content, API keys, or tokens into this file. Trim error messages to the relevant lines.

## Entry format

Append newest entries at the **bottom**, using exactly this shape:

```
## <YYYY-MM-DD HH:MM> · <agent> · <slug> · <RESOLVED | WORKAROUND | BLOCKED>
- **Step:** <phase / what you were doing>
- **Problem:** <one-line symptom>
- **Error:** `<verbatim error, trimmed, secrets stripped>`
- **Attempts:** 1) <fix tried> 2) <different fix tried>   (max per the retry cap)
- **Outcome:** <fixed how / working around by … / blocked, needs user>
- **Suggested fix:** <one line so the next run / a human can fix the root cause>
```

Example:

```
## 2026-07-01 14:22 · build · wheel-deal-driver-training · WORKAROUND
- **Step:** capturing the inspiration screenshot before building the hero
- **Problem:** screenshot came back blank
- **Error:** `snap.sh: could not capture https://… (site blocked the screenshot)`
- **Attempts:** 1) re-ran snap.sh 2) tried the WebFetch text instead
- **Outcome:** built from the fetched page text + the client's stated style notes
- **Suggested fix:** ask the client for a direct screenshot of the reference
```

---

## Log

<!-- Agents: append new entries below this line, newest at the bottom. -->

## 2026-07-11 13:40 · build · wheel-deal · WORKAROUND
- **Step:** studying the §4 authoritative style-match (v0.app demo) before building
- **Problem:** the v0.app chat URL is a read-only, sign-in-gated chat; its live preview pane is blank without auth
- **Error:** `snap.sh captured only the v0 chat UI (Sign In/Sign Up); WebFetch returned only the chat shell, no rendered design`
- **Attempts:** 1) snap.sh screenshot of the chat URL 2) WebFetch text of the same URL
- **Outcome:** falling back per the brief to the A+ Drivers reference (aplusdriversnl.com) + the stated brand colors (red/grey/black) and vibe; proceeding with design plan
- **Suggested fix:** developer to export the v0 demo (published URL or screenshots) or duplicate the chat to a viewable deployment

<!-- The entries below were reconstructed on 2026-08-11 from git history + the working tree:
     they cover the wheel-deal build, ship, and launch-prep work of 2026-07-12 → 2026-08-04,
     which predates the habit of logging as you go. Dated at the time of the event. Where no
     error was captured at the time, the Error line says so rather than inventing one.
     Their back-port into `starter_pack` is queued in `logs/starter-pack-backport.md`. -->

## 2026-07-12 15:25 · build · wheel-deal · RESOLVED
- **Step:** building the first page set (header, hero, programs, gallery, value props, footer)
- **Problem:** the starter ships only `button` in `src/components/ui/`, so the build stalls on shadcn installs before any design work happens — and each install is an interactive CLI round-trip
- **Error:** n/a — friction, not a failure: ten primitives had to be fetched mid-build
- **Attempts:** 1) added each primitive when its import failed 2) batched the remainder into one `npx shadcn@latest add …`
- **Outcome:** accordion, badge, card, input, label, separator, sheet, sonner, textarea added; `form` followed on 07-13. Every later page reused them
- **Suggested fix:** pre-install that set in `starter_pack/src/components/ui/` so a build starts with primitives already present

## 2026-07-13 10:16 · build · wheel-deal · RESOLVED
- **Step:** wiring the contact form to Web3Forms using the snippet in `AGENTS.md`
- **Problem:** the documented snippet is a bare `useWeb3forms` call — no schema validation, no handling for an unset/placeholder access key, no submit-error UX. An unconfigured key produced a form that looked like it worked and silently dropped leads
- **Error:** n/a — the failure mode is the absence of an error: the hook's `onError` was unwired, so nothing surfaced
- **Attempts:** 1) inline required-field checks in the component 2) react-hook-form + `zodResolver` + shadcn `Form`, schema centralized in `src/lib/validators.ts`, plus an access-key guard
- **Outcome:** `src/components/contact-form.tsx` now validates client-side, detects the `.env.example` placeholder key and tells the visitor to call instead, keeps the `botcheck` honeypot, and toasts success/failure via sonner
- **Suggested fix:** ship `src/lib/validators.ts` + that `contact-form.tsx` as a reference implementation in `starter_pack`, and replace the thin `AGENTS.md` snippet with a pointer to it

## 2026-07-16 10:22 · main · wheel-deal · RESOLVED
- **Step:** reviewing the generated `src/` against the team's deepflow-labs monorepo-template
- **Problem:** nothing in the pipeline encoded house style, so the built site drifted — mixed quote styles, ad-hoc form wiring, magic strings for phone/email/routes, no formatter config
- **Error:** n/a — style drift found on review, not a build failure
- **Attempts:** 1) fixed the drift by hand across components 2) wrote the rules down as a skill so the next build starts compliant
- **Outcome:** added `.claude/skills/web-conventions/SKILL.md` (205 lines: stack, file/component layout, validation, forms, error handling, constants, formatting, pre-ship checklist), `.prettierrc`, and the deps it assumes (`prettier`, `react-hook-form`, `@hookform/resolvers`, `sonner`); `AGENTS.md` and `.claude/agents/build.md` now both point at it
- **Suggested fix:** back-port skill + `.prettierrc` + deps to `starter_pack`, and add the `format` / `format:check` npm scripts — the skill mandates Prettier but no script runs it

## 2026-07-16 10:48 · main · wheel-deal · RESOLVED
- **Step:** writing the client-facing launch docs (later `meeting.md`, `gbp-setup.md`)
- **Problem:** long-form docs for a non-technical client kept coming out as unstructured info dumps; no repeatable process for gathering context then testing the doc on a reader
- **Error:** n/a — output-quality problem
- **Attempts:** 1) drafted straight from notes 2) installed the `doc-coauthoring` skill and ran its three stages (context gathering → refinement → reader testing)
- **Outcome:** `.claude/skills/doc-coauthoring/SKILL.md` added; the launch docs were produced through it and hold up as standalone client deliverables
- **Suggested fix:** back-port the skill to `starter_pack` — every client engagement ends in written handover material, so it belongs in the pipeline, not just this repo

## 2026-07-16 12:41 · build · wheel-deal · RESOLVED
- **Step:** testing the built site on a phone before showing the client
- **Problem:** React hydration mismatch on iOS Safari only — desktop and Android were clean. iOS auto-linkifies phone numbers, dates, and addresses in plain text, mutating the DOM before React hydrates
- **Error:** n/a — reproduced as a hydration mismatch on iOS Safari; console text not captured at the time
- **Attempts:** 1) suspected the fonts/`suppressHydrationWarning` 2) traced it to iOS auto-detection and disabled it via metadata
- **Outcome:** `formatDetection: { telephone: false, date: false, address: false, email: false }` in `rootMetadata` ([src/lib/seo.ts:42](../src/lib/seo.ts#L42)); the site already ships real `tel:` links so nothing was lost
- **Suggested fix:** bake `formatDetection` into the `starter_pack` root metadata by default — every local-business site has a phone number in the markup, so this recurs on every client

## 2026-07-16 17:12 · build · wheel-deal · RESOLVED
- **Step:** adding scroll-reveal animation to the home, programs, and policies sections
- **Problem:** `framer-motion`'s `whileInView` starts at `opacity: 0`; with JS disabled or blocked, pricing and policy content never animates in and the page renders effectively blank
- **Error:** n/a — reproduced by disabling JS; the sections stay at `opacity:0`
- **Attempts:** 1) considered dropping motion for CSS-only transitions 2) kept motion and added a no-JS escape hatch
- **Outcome:** `Reveal` tags its wrapper `data-reveal` and `app/layout.tsx` ships a `<noscript>` style forcing `opacity:1` ([src/app/layout.tsx:28-32](../src/app/layout.tsx#L28-L32))
- **Suggested fix:** back-port `reveal.tsx` + the `<noscript>` fallback. Also resolve a contradiction introduced here: `.claude/agents/build.md` was edited to say a motion library is *not* installed and should only be added if needed, while `package.json` still ships `framer-motion` and seven components import it — decide one way in `starter_pack` and make doc and deps agree

## 2026-07-16 21:50 · build · wheel-deal · RESOLVED
- **Step:** making the finished site findable (SEO, structured data) before launch
- **Problem:** the pipeline had no SEO scaffolding at all — no metadata strategy, no sitemap, no robots, no JSON-LD — and `metadataBase` needs an absolute origin the client did not have yet (no domain purchased)
- **Error:** n/a — gap in the starter, surfaced at ship time
- **Attempts:** 1) per-page inline `metadata` objects 2) centralized it: one `siteUrl` constant fed by `NEXT_PUBLIC_SITE_URL` with a placeholder fallback, consumed everywhere
- **Outcome:** `src/lib/constants.ts` (`siteUrl`, `site`, `routes`), `src/lib/seo.ts` (`rootMetadata`, `buildPageMetadata()`, `businessJsonLd`, `buildFaqJsonLd()`), `src/app/sitemap.ts`, `src/app/robots.ts`, and `NEXT_PUBLIC_SITE_URL` documented in `.env.example`
- **Suggested fix:** back-port all four files to `starter_pack` as fill-in-the-blank templates (LocalBusiness JSON-LD with a `@type` the build agent swaps per client), and add "set `NEXT_PUBLIC_SITE_URL` once the domain is bought" to the build agent's ship checklist

## 2026-07-17 00:45 · main · wheel-deal · WORKAROUND
- **Step:** committing the client's brief, downloaded assets, and logo design files so the work survives outside one machine
- **Problem:** the starter's `.gitignore` deliberately excludes `/clients/*`, `/intake/*`, and `designs` — the exact material that needed version control here. Deleting those rules also put `intake/website_intake_form.csv` under version control, which holds **PII for every form submission**, not just this client's
- **Error:** n/a — self-inflicted; confirmed after the fact with `git ls-files clients intake`
- **Attempts:** 1) deleted the client/intake/designs ignore rules wholesale (commit `3ba823b`) 2) no narrower rule was tried
- **Outcome:** working around it — `dev` is a private remote and the public-facing `prod` branch strips `clients/`, `intake/`, `designs/` (see the next entry), so nothing leaks publicly; but the PII is in `dev`'s history permanently
- **Suggested fix:** in `starter_pack`, keep the ignores and track client work another way (private submodule, or per-client repo). If tracking it in-repo is the deliberate policy, then at minimum keep `/intake/*` ignored — one CSV row is one client, the whole file is everyone. Separately, `.env*` was added to `.gitignore` (commit `6ca0439`) with no `!.env.example` negation: `.env.example` survives here only because it was already tracked, and a fresh `starter_pack` clone would silently stop tracking it

## 2026-07-17 01:57 · main · wheel-deal · RESOLVED
- **Step:** deploying to Vercel production without publishing the internal pipeline files (`AGENTS.md`, `.claude/`, `clients/`, `designs/`, `intake/`, `logs/`, `scripts/`)
- **Problem:** the repo doubles as the client's deployable site and as our working pipeline. Vercel's Git integration would ship everything, and a `dev → prod` merge that deletes those paths conflicts with every subsequent change to them
- **Error:** modify/delete conflicts on `dev → prod` — the failure mode is now documented in the workflow header ([deploy-prod.yml:10-14](../.github/workflows/deploy-prod.yml#L10-L14))
- **Attempts:** 1) manual `git rm` passes on the `prod` branch (`3b51873`, `16bfdf6`) 2) a merge-based workflow (`c45f435`) 3) `prod` as a *generated* snapshot: `git checkout -B prod` off `dev`, `git rm -r --ignore-unmatch` the internal paths, one fresh commit, force-push — never merged back (`02e1366`, `6ca0439`)
- **Outcome:** `.github/workflows/deploy-prod.yml` — manual `workflow_dispatch`, concurrency-guarded, deploys the stripped tree via the Vercel CLI (`pull` → `build --prod` → `deploy --prebuilt --prod`) so we control what and when to ship
- **Suggested fix:** back-port the workflow to `starter_pack` with the strip list kept in one place, and document the three required repo secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) in `README.md` — without them a fresh repo force-pushes `prod` and then dies at `vercel pull`. It took three attempts here; the third is the one to copy

## 2026-08-02 21:27 · main · wheel-deal · BLOCKED
- **Step:** taking the finished site live for the client
- **Problem:** the pipeline stops at "built site". Everything between a working build and a live business — buy a domain, create and verify a Google Business Profile, get reviews flowing into the site, point the contact form at a real inbox — has no phase, no agent, and no templates, and the four items have dependencies on each other (GBP verification gates the reviews integration, which gates the testimonials section)
- **Error:** n/a — missing pipeline stage
- **Attempts:** 1) treated launch as ad-hoc post-build tasks — stalled on ordering and on which decisions actually need the client 2) wrote the sequencing down as a dependency map and a scripted client meeting
- **Outcome:** unblocked by hand, not by the pipeline: `meeting.md` (dependency map + a ~45-min meeting reduced to 3 client decisions and 2 clicks), `gbp-setup.md` (421 lines: account ownership, verification video, content sheet), `verification_script.md` (word-for-word field script). Still blocked as a repeatable phase
- **Suggested fix:** add a third phase to `starter_pack` — `intake → build → launch` — with a `launch` agent and client-neutral templates generalized from these three docs (domain shortlist, GBP setup + verification, form inbox, review pipeline). This is the single largest gap between the starter and what a client engagement actually needs

## 2026-08-04 14:07 · main · wheel-deal · WORKAROUND
- **Step:** building the testimonials section before the client had a Google Business Profile
- **Problem:** the section needs reviews and none exist yet — GBP isn't verified, so the Places API has nothing to return. The placeholder data written to fill the layout is **fabricated review text attributed to real, named people**, and it is in the shipped tree
- **Error:** n/a — correctness/ethics issue, not a build failure
- **Attempts:** 1) shipped hardcoded sample reviews in `src/lib/reviews.ts` to make the section render 2) specified the real integration (Places API New, server-side fetch, 24h ISR, required Google attribution) in `meeting.md` for when verification lands
- **Outcome:** working around it — the placeholders are flagged in-file as PLACEHOLDER, but they render as genuine testimonials to any visitor and must be removed before the site is public
- **Suggested fix:** `starter_pack`'s testimonials template must default to an **empty state** ("be our first review" CTA), with `getReviews()` returning `null` on any error or missing key and the section rendering nothing rather than filler. Never seed a client-facing component with invented social proof — a placeholder that looks real is one forgotten task away from being a lie on a live site

<!-- Entries below are from the back-port work itself (starter-pack-backport.md), run in
     starter_pack on 2026-08-11. Slug `starter-pack` = the template repo, not a client. -->

## 2026-08-11 11:05 · main · starter-pack · WORKAROUND
- **Step:** item 3 of the back-port — pre-installing the ten shadcn primitives, `form` last
- **Problem:** `npx shadcn@latest add form` exits 0 and writes nothing. The other nine installed fine. This repo's `components.json` uses `"style": "radix-nova"`, and that style's registry entry for `form` ships **no files** — so the CLI has nothing to write and reports no error
- **Error:** `✔ Checking registry.` then exit 0, no "Created" line; `curl https://ui.shadcn.com/r/styles/radix-nova/form.json` → `{"name":"form","type":"registry:ui"}` with no `files` key
- **Attempts:** 1) re-ran with `--overwrite` (same silent no-op) 2) shadcn MCP `view_items_in_registries` — reports the item exists with "1 file(s)" but returns no content 3) fetched the registry JSON directly, which located the empty-for-this-style entry
- **Outcome:** took the `new-york-v4` style's `form.json`, which is populated, and rewrote its one unresolved import (`@/registry/new-york-v4/ui/label` → `@/components/ui/label`) — the alias rewrite the CLI normally does. `form.tsx` is RHF context plumbing with almost no styling, so cross-style skew is immaterial here. `npm run build` clean
- **Suggested fix:** if a `shadcn add` prints no "Created" line, don't retry the CLI — check `https://ui.shadcn.com/r/styles/<style-from-components.json>/<item>.json` for a `files` key, and fall back to another style's copy + fix the `@/registry/...` imports. Do **not** copy primitives from an existing client repo instead: `button.tsx` there is an older shadcn generation and you'd silently downgrade the set

## 2026-08-11 11:20 · main · starter-pack · RESOLVED
- **Step:** item 1 — adding the deps the `web-conventions` skill assumes
- **Problem:** the back-port queue says to skip `next-themes` because "nothing imports it". That was true of the client repo's older `sonner.tsx`, but the current shadcn registry's `sonner.tsx` opens with `import { useTheme } from "next-themes"` — so the CLI reinstalled it and the build needs it
- **Error:** n/a — caught by reading the generated `sonner.tsx`, before it could fail
- **Attempts:** 1) verified with `grep -rn "next-themes" client_wheel_deal/src/` (no hits there, confirming the queue's claim was right *at the time*) 2) kept the dep rather than hand-editing the registry component to drop theming
- **Outcome:** `next-themes` stays. Everything else in item 1 applied: `.prettierrc`, `react-hook-form`, `@hookform/resolvers`, `sonner`, `prettier`, and `format` / `format:check` scripts
- **Suggested fix:** none needed here — but treat "dep X is unused" notes in a back-port queue as time-stamped, not current. Re-grep the *generated* files before dropping a dep

## 2026-08-11 11:40 · main · starter-pack · RESOLVED
- **Step:** running the new `npm run format` (`prettier --write .`) for the first time
- **Problem:** it reflowed **every** markdown file in the repo — including this append-only log, the agent prompts, and `clients/_template/brief.md`. 747 insertions / 360 deletions across 9 files, none of them source. Reverting that churn with `git checkout` then destroyed uncommitted work in `logs/README.md`
- **Error:** n/a — no failure; the damage was a `prettier --write .` blast radius plus a too-broad `git checkout --` on files with unstaged changes
- **Attempts:** 1) reverted the prettier-only files wholesale — which took the log's uncommitted entries with them 2) added a `.prettierignore` so it can't happen again, and restored the log from the file contents read earlier in the session
- **Outcome:** `.prettierignore` now excludes `logs/`, `.claude/`, `clients/`, `intake/` — Prettier owns `src/` and the root docs only. Log restored and verified as a pure-addition diff against HEAD
- **Suggested fix:** before running a repo-wide `--write` formatter, check `git status` for uncommitted work, and never `git checkout --` a file you haven't diffed. `.prettierignore` now prevents the first half of this
