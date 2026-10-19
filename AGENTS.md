# Project guide

A repeatable pipeline that turns a client intake form into a **built website**
on a fixed stack: **Next.js · React · Tailwind · shadcn**. Claude does the whole
thing end to end — no v0, no backend, no paid design tool.

## Pipeline

```
intake → build → finish review
```

- **intake** ([.claude/agents/intake.md](.claude/agents/intake.md)) — reads one
  row of the Google-Form CSV in `intake/` → fills `clients/<slug>/brief.md`
  (design direction + inspiration links) and downloads the client's Drive assets
  (optional, needs rclone). **You review the brief** before building; the main
  session then derives `PRODUCT.md` from it with the impeccable skill.
- **build** ([.claude/agents/build.md](.claude/agents/build.md)) — studies the
  brief's inspiration sites (**screenshot via `scripts/snap.sh` + fetched text
  via WebFetch**), sets the brand theme, then designs (with impeccable) and
  builds the pages into `src/app/` with Tailwind + shadcn. Wires any contact
  form to Web3Forms, verifies `npm run build`, and captures desktop/mobile
  screenshots with `scripts/shot.mjs`.
- **finish review** — the main session runs impeccable's
  `impeccable-finish-reviewer` on those screenshots (at most two fix rounds,
  applied by the build agent), then `impeccable-documenter` writes `DESIGN.md`.
  Both run from the main session because subagents can't spawn subagents.

Run it all with **`/new-site "Business Name"`**, or dispatch one agent at a time
(e.g. "run the build agent for `<slug>`"). Client briefs/assets live under
`clients/<slug>/` and **are tracked in git** — see
[README → Client data policy](README.md#client-data-policy). That only holds on
a private remote: briefs hold client PII and `intake/*.csv` holds PII for every
form submission. The `deploy-prod` workflow strips both from the public `prod`
branch.

## This is NOT the Next.js you know

- This version has breaking changes — APIs, conventions, and file structure may
  all differ from your training data. Read the relevant guide in
  `node_modules/next/dist/docs/` before writing any code. Heed deprecation
  notices.

## Conventions

- **Follow the `web-conventions` skill** (`.claude/skills/web-conventions/`) for
  all code under `src/` — it is the authoritative house standard (component/file
  layout, forms, validation, error handling, constants, and formatting), derived
  from the deepflow-labs monorepo-template. Read it before writing or editing
  any `.ts`/`.tsx`. The bullets below are a quick summary.
- UI components come from **shadcn** only (no antd, no other UI kit). Add them
  with the shadcn CLI / MCP; they land in `src/components/ui/`.
- **Tailwind** for all styling — no inline `style` hacks.
- **Animations:** `framer-motion` is installed
  (`import { motion } from "framer-motion"`); use it for entrance / scroll /
  hover motion (client components only). Plain Tailwind / `tw-animate-css` is
  fine for simple transitions.
- Path aliases (see `components.json`): `@/components`, `@/lib`,
  `@/components/ui`, `@/lib/utils`, `@/hooks`.
- The `cn()` helper in `src/lib/utils.ts` merges class names.

## Design: the impeccable skill

The **impeccable** skill (`.claude/skills/impeccable/`, `/impeccable`) is the
design layer: the build agent designs with it, and `/impeccable critique`,
`polish`, `audit`, and the rest refine a built site. It keeps per-client design
records: `PRODUCT.md` (product truth, derived from the brief), the direction
contract (`.impeccable/surfaces/`), and `DESIGN.md` + `.impeccable/design.json`
(the built design system). They're tracked in the client repo, skipped by
Prettier, and stripped from `prod`.

- **Not in the template.** Don't run `/impeccable init` or
  `/impeccable document` here: every client clone would inherit the record. The
  placeholder page and stock shadcn theme aren't an incumbent design; each
  client build creates its own visual world from the brief.
- **Who decides what.** House rules (this file, `web-conventions`) govern code.
  The brief governs direction: a §4 Developer style-match pins it, so
  impeccable's direction roll (`concept-seed`) is skipped. Impeccable governs
  craft (`reference/craft-floor.md`) wherever the brief is silent.
- **Where impeccable's defaults clash with a house rule, the house rule wins:**
  - No fabrication beats "author demonstration content" and "no section is
    omittable": no synthetic stats, reviews, or logos, even labeled. Render an
    empty state or omit the section.
  - shadcn-only beats "rebuild every atom": restyle the primitives in
    `src/components/ui/` into the world's vocabulary; never hand-roll a
    replacement or add another kit.
  - Fonts load through `next/font`, never a Google Fonts `<link>`.
  - Scroll reveals use `<Reveal>`. Browser-surface theming (`::selection`, focus
    rings, scrollbars) goes in `globals.css`, never inline `style`.
  - Imagery: the client's assets first. Anything else must be licensed for
    commercial use, saved into `public/images/` (never hotlinked), and flagged
    in the summary.
- **Design hook.** The per-edit detector hook lives in the gitignored
  `.claude/settings.local.json`, so a fresh clone has none until you run
  `/impeccable hooks on`. Without it, `impeccable context` tells the build to
  run the detector once at the end instead. Triage findings per
  `reference/hooks.md`; a finding that contradicts a brief pin is a sanctioned
  exception (`impeccable hooks ignore-value … --reason "brief: …"`).
- **Screenshots of the local site** come from `node scripts/shot.mjs`;
  `scripts/snap.sh` can't reach localhost.

## Contact forms (Web3Forms)

Contact / lead forms email submissions straight to an inbox via **Web3Forms** —
no backend, no database.

**Don't write one from scratch.**
[`src/components/contact-form.tsx`](src/components/contact-form.tsx) is the
**reference implementation**: react-hook-form + `zodResolver` against
[`src/lib/validators.ts`](src/lib/validators.ts), an access-key guard, the
`botcheck` honeypot, and sonner toasts on both paths. Restyle it to the client's
design and change the fields, but keep those four behaviors — an earlier
hand-rolled version looked like it worked while silently dropping every lead,
because the key was unset and `onError` was unwired.

**Setup (once per site):**

1. Get a free access key at https://web3forms.com — enter the destination inbox
   and the key is emailed instantly (no account). Use a separate key per client
   site.
2. Put it in `.env.local` (copy from `.env.example`):
   `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY=...`. The key is public/safe to ship to the
   browser — it only allows _submitting_ to the bound inbox, nothing else. Set
   it in the **Vercel production environment** too — `.env.local` never reaches
   CI.

**Alternative — hide the key / validate server-side:** POST the same fields to
`https://api.web3forms.com/submit` from a Next.js **server action** instead of
the client hook; then the key can be a plain (non-`NEXT_PUBLIC_`) env var. The
client hook needs no server code at all — prefer it unless you specifically need
server-side handling.

## What already ships in `src/`

Fill these in rather than recreating them:

| File                              | What it is                                                                                                                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/constants.ts`                | `siteUrl`, `site` (name/phone/email/location), `routes`. No magic strings elsewhere.                                                                                                                       |
| `lib/seo.ts`                      | `rootMetadata`, `buildPageMetadata()`, `businessJsonLd`, `buildFaqJsonLd()`. Pick the right schema.org subtype; **keep `formatDetection`** (it prevents an iOS-only hydration mismatch).                   |
| `lib/validators.ts`               | Every zod schema, with `z.infer` types.                                                                                                                                                                    |
| `app/sitemap.ts`, `app/robots.ts` | Driven by `siteUrl` + `routes`. Prune to the routes you build.                                                                                                                                             |
| `components/contact-form.tsx`     | Web3Forms reference implementation (above).                                                                                                                                                                |
| `components/reveal.tsx`           | Scroll-reveal wrapper, paired with the `<noscript>` fallback in `app/layout.tsx`. **Don't use bare `whileInView` with `opacity: 0`** without that fallback — the section renders blank when JS is blocked. |
| `components/ui/`                  | shadcn: accordion, badge, button, card, form, input, label, separator, sheet, sonner, textarea.                                                                                                            |

## Never fabricate content

Never put **invented testimonials, reviews, ratings, review counts, awards,
client logos, or statistics** into a client-facing component — not even as
placeholder data flagged in a comment. It renders as a genuine claim to every
visitor and is one forgotten task away from being a lie on a live site. If the
data doesn't exist yet, render an **empty state** (e.g. a "be our first review"
CTA) or omit the section, and flag the gap in your summary. Restrained
placeholder _copy_ is fine; fake facts are not.

## Operational rules (all agents)

Applies to the `intake` and `build` agents and the main session. The goal:
**fail fast, log it, never spin.**

- **Bounded retries.** When a step fails (a tool error, a failed
  `npm run build`, a screenshot that won't capture), retry with a **materially
  different** fix **at most twice**. If two distinct approaches both fail,
  **stop and escalate** with what you tried — don't invent variations in a loop.
  Prefer the cheapest fix first.
- **Scope & tokens.** Touch only the target client's folder / this phase's
  files. Read the specific part of a file you need instead of re-scanning the
  repo. If a subtask balloons, pause and report progress rather than pressing on
  silently.
- **Log real problems** to [`logs/README.md`](logs/README.md) — especially when
  you give up (`BLOCKED`) or work around something (`WORKAROUND`) — in the
  format defined there. Reference the client by **slug only**; never write PII,
  keys, or tokens into the log. A non-blocking failure: log it, say you're
  skipping it, and continue.
