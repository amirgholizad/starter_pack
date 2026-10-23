# Client Website Starter Pack

Turns a client intake form into a **built website** on a fixed stack — **Next.js
· React · Tailwind · shadcn**. Claude does the whole thing: it reads the intake
CSV, studies the client's inspiration sites, and builds the pages directly. No
v0, no backend, no paid design tool.

> This is **not** standard Next.js — this version has breaking changes vs. older
> releases. See [AGENTS.md](AGENTS.md) and read `node_modules/next/dist/docs/`
> before writing code.

## The pipeline

```
intake → build → finish review
```

| Phase | Agent                                                 | What it does                                                                                                                                                                             | Your gate                                                                    |
| ----- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1     | `intake`                                              | Fills `clients/<slug>/brief.md` from the CSV row, downloads Drive assets; the approved brief then becomes `PRODUCT.md`                                                                   | Review the brief, resolve `(confirm: …)` flags; answer any `PRODUCT.md` gaps |
| 2     | `build`                                               | Studies the inspiration sites (screenshot + text), designs with the impeccable skill, and builds the pages in Tailwind + shadcn; wires the contact form to Web3Forms; verifies the build | OK the design plan; review the running site                                  |
| 3     | `impeccable-finish-reviewer`, `impeccable-documenter` | Reviews screenshots of the built site against its design direction (at most two fix rounds), then records `DESIGN.md`                                                                    | Decide anything still open after two rounds                                  |

Run the whole thing in one Claude session:

```
/new-site "Business Name"
```

…or dispatch a single phase — _"run the **intake** agent for Acme Co from the
CSV in intake/"_. Details in [AGENTS.md](AGENTS.md) and
[clients/README.md](clients/README.md).

## Prerequisites

- **Node.js 20.9+** and **npm** — https://nodejs.org
- **Git** — https://git-scm.com
- **Claude Code CLI** — `npm install -g @anthropic-ai/claude-code` (the pipeline
  runs inside it)
- **Google Chrome** — `scripts/shot.mjs` drives it (through `playwright-core`)
  to screenshot the local site for the design review; set `CHROME_PATH` to use
  another Chromium.
- **rclone** _(optional)_ — `brew install rclone` — only needed to auto-download
  client assets from Google Drive; without it, drop assets into
  `clients/<slug>/assets/` by hand.

## Get started

```bash
git clone https://github.com/amirgholizad/starter_pack.git
cd starter_pack
npm install
npm run dev          # http://localhost:3000
```

Impeccable's design checks run automatically after each UI edit (the hook in
`.claude/settings.json`). The first run on a machine downloads its engine (~16
MB, cached in `~/.impeccable/`); `/impeccable hooks off` turns the checks off
for a project.

To build a client site: drop their Google Form CSV export into
[`intake/`](intake/README.md), then run `/new-site "Business Name"` inside a
Claude Code session.

## Scripts

| Command                                            | What it does                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm run dev`                                      | Start the dev server                                                                        |
| `npm run build`                                    | Production build (the build agent's success gate)                                           |
| `npm run start`                                    | Serve the production build                                                                  |
| `npm run lint`                                     | Run ESLint                                                                                  |
| `npm run format`                                   | Format with Prettier (`.prettierrc`)                                                        |
| `npm run format:check`                             | Verify formatting without writing                                                           |
| `scripts/snap.sh <url> <out.png>`                  | Screenshot an inspiration URL to a local PNG                                                |
| `node scripts/shot.mjs <url> <out.png> [width]`    | Full-page screenshot of a local page (reveals played, reduced motion) for the design review |
| `python scripts/fetch-drive-assets.py <brief.md>`  | Download a client's Drive assets (needs rclone)                                             |
| `node scripts/pexels.mjs search "<query>"`         | Search Pexels stock photos; renders a numbered contact sheet to pick from                   |
| `node scripts/pexels.mjs get <id> <out.jpg>`       | Self-host a Pexels photo with its origin embedded (`--log` records it)                      |
| `node scripts/pexels.mjs search-video "<query>"`   | Search Pexels stock video; the contact sheet shows four frames per clip                     |
| `node scripts/pexels.mjs get-video <id> <out.mp4>` | Self-host a Pexels clip plus its poster; `--scrub` encodes it for a GSAP scroll scrub       |

Prettier owns `src/` and the root docs. The pipeline's own prompts and records
(`.claude/`, `logs/`, `clients/`, `intake/`, and impeccable's `PRODUCT.md`,
`DESIGN.md`, and `.impeccable/`) are in [`.prettierignore`](.prettierignore) —
reflowing an append-only log only creates diff noise.

## Adding shadcn components

UI components come from [shadcn](https://ui.shadcn.com) and live in
`src/components/ui/`:

```bash
npx shadcn@latest add <component>
```

The shadcn MCP server is also wired up in [`.mcp.json`](.mcp.json) for use
inside Claude Code.

## Contact forms

Contact/lead forms send email via [Web3Forms](https://web3forms.com) — no
backend needed.
[`src/components/contact-form.tsx`](src/components/contact-form.tsx) is the
reference implementation (zod validation, access-key guard, honeypot, toasts) —
restyle it rather than writing a new one. Copy [`.env.example`](.env.example) to
`.env.local` and set `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` (a free, per-site key).
Full pattern in [AGENTS.md](AGENTS.md#contact-forms-web3forms).

## Client data policy

**`clients/`, `intake/`, and `designs/` are tracked in git**, so client work
survives outside one machine.

> ⚠️ **This requires a private remote.** Briefs hold client PII and
> `intake/*.csv` holds PII for **every** form submission — not just the client
> you're building for. Git history is permanent: a repo that is public even
> briefly cannot be un-leaked by a later commit. Confirm the remote is private
> before you add it.

The public-facing `prod` branch is what keeps this material off the internet —
see below.

## Deploying

[`.github/workflows/deploy-prod.yml`](.github/workflows/deploy-prod.yml) is a
manual (`workflow_dispatch`) job that regenerates `prod` as a snapshot of `dev`
minus the internal pipeline files (`AGENTS.md`, `.claude/`, `clients/`,
`intake/`, `designs/`, `logs/`, `scripts/`, plus impeccable's `PRODUCT.md`,
`DESIGN.md`, and `.impeccable/` — the `STRIP_PATHS` env var), then builds and
deploys that tree to Vercel via the CLI.

`prod` is **generated and force-pushed, never merged back**. That's deliberate:
a `dev → prod` merge hits modify/delete conflicts on every one of those paths.

Set these three **repo secrets** first — without them the workflow force-pushes
`prod` and then dies at `vercel pull`:

| Secret              | Where to get it                            |
| ------------------- | ------------------------------------------ |
| `VERCEL_TOKEN`      | Vercel → Account Settings → Tokens         |
| `VERCEL_ORG_ID`     | `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` after `vercel link` |

Set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` in the Vercel
**production environment** too — `.env.local` never reaches CI.

## Layout

```
.claude/agents/        # intake + build agents, plus impeccable's reviewer/documenter/helpers
.claude/commands/      # /new-site pipeline command
.claude/skills/        # web-conventions (house code standards), impeccable (design), doc-coauthoring
.claude/settings.json  # shared Claude Code settings: impeccable's design hook
.github/workflows/     # deploy-prod.yml
clients/               # per-client brief + assets (tracked — private remote only)
intake/                # drop Google Form CSVs here (tracked — holds PII)
logs/                  # agent problem log
scripts/               # snap.sh, shot.mjs, pexels.mjs, fetch-drive-assets.py
src/
  app/                 # routes (App Router) — layout.tsx, page.tsx, sitemap.ts, robots.ts
  components/          # contact-form.tsx (reference impl), reveal.tsx
  components/ui/       # shadcn components
  lib/                 # constants.ts, seo.ts, validators.ts, utils.ts
components.json        # shadcn config + path aliases
.prettierrc            # formatting (enforced by the web-conventions skill)
```
