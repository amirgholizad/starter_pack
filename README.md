# Client Website Starter Pack

Turns a client intake form into a **built website** on a fixed stack —
**Next.js · React · Tailwind · shadcn**. Claude does the whole thing: it reads the intake CSV,
studies the client's inspiration sites, and builds the pages directly. No v0, no backend, no
paid design tool.

> This is **not** standard Next.js — this version has breaking changes vs. older releases.
> See [AGENTS.md](AGENTS.md) and read `node_modules/next/dist/docs/` before writing code.

## The pipeline

```
intake → build
```

| Phase | Agent | What it does | Your gate |
|-------|-------|--------------|-----------|
| 1 | `intake` | Fills `clients/<slug>/brief.md` from the CSV row, downloads Drive assets | Review the brief, resolve `(confirm: …)` flags |
| 2 | `build` | Studies the inspiration sites (screenshot + text) and builds the pages in Tailwind + shadcn; wires the contact form to Web3Forms; verifies the build | OK the design plan; review the running site |

Run the whole thing in one Claude session:

```
/new-site "Business Name"
```

…or dispatch a single phase — *"run the **intake** agent for Acme Co from the CSV in intake/"*.
Details in [AGENTS.md](AGENTS.md) and [clients/README.md](clients/README.md).

## Prerequisites

- **Node.js 20.9+** and **npm** — https://nodejs.org
- **Git** — https://git-scm.com
- **Claude Code CLI** — `npm install -g @anthropic-ai/claude-code` (the pipeline runs inside it)
- **rclone** *(optional)* — `brew install rclone` — only needed to auto-download client assets
  from Google Drive; without it, drop assets into `clients/<slug>/assets/` by hand.

## Get started

```bash
git clone https://github.com/amirgholizad/starter_pack.git
cd starter_pack
npm install
npm run dev          # http://localhost:3000
```

To build a client site: drop their Google Form CSV export into [`intake/`](intake/README.md),
then run `/new-site "Business Name"` inside a Claude Code session.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (the build agent's success gate) |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `scripts/snap.sh <url> <out.png>` | Screenshot an inspiration URL to a local PNG |
| `python scripts/fetch-drive-assets.py <brief.md>` | Download a client's Drive assets (needs rclone) |

## Adding shadcn components

UI components come from [shadcn](https://ui.shadcn.com) and live in `src/components/ui/`:

```bash
npx shadcn@latest add <component>
```

The shadcn MCP server is also wired up in [`.mcp.json`](.mcp.json) for use inside Claude Code.

## Contact forms

Contact/lead forms send email via [Web3Forms](https://web3forms.com) — no backend needed.
The `@web3forms/react` library is installed; copy [`.env.example`](.env.example) to `.env.local`
and set `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` (a free, per-site key). See the full pattern in
[AGENTS.md](AGENTS.md#contact-forms-web3forms).

## Layout

```
.claude/agents/        # intake + build agents
.claude/commands/      # /new-site pipeline command
clients/               # per-client brief + assets (gitignored; _template tracked)
intake/                # drop Google Form CSVs here (gitignored)
logs/                  # agent problem log
scripts/               # snap.sh, fetch-drive-assets.py
src/
  app/                 # routes (App Router) — layout.tsx, page.tsx, globals.css
  components/ui/        # shadcn components
  lib/utils.ts         # cn() class-name helper
components.json         # shadcn config + path aliases
```
