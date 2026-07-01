# Client Website Starter Pack

A repeatable pipeline that turns a client intake form into a **deployed website** on a fixed
stack — **Next.js · React · Tailwind · shadcn · Supabase · Vercel**. Designs are generated
with **v0**; the app is built, wired, and shipped by a chain of Claude Code agents.

> This is **not** standard Next.js — `middleware.ts` is `proxy.ts`, `cookies()` is async, and
> more. See [AGENTS.md](AGENTS.md) and read `node_modules/next/dist/docs/` before writing code.

## The pipeline

```
intake → design → build → db → deploy
```

| Phase | Agent | What it does | Your gate |
|------|-------|--------------|-----------|
| 1 | `intake` | Fills `clients/<slug>/brief.md` from the CSV row, downloads Drive assets, installs privacy `.gitignore` | Review the brief, resolve `(confirm: …)` flags |
| 2 | `design` | Generates each page in v0 from the brief + real assets | Approve each page |
| 3 | `build` | Refactors approved v0 code into the real Next.js app, verifies `npm run build` | — |
| 4 | `db` | Provisions a per-client Supabase project, creates tables + RLS + TS types | Re-auth the MCP after the project swap |
| 5 | `deploy` | Links Vercel, sets env vars, ships a preview | Approve the preview before production |

Full detail + troubleshooting: **[WORKFLOW.md](WORKFLOW.md)**.

## Prerequisites

Install these once on your machine:

- **Node.js 20.9+** and **npm** — https://nodejs.org (the repo runs on Node 22; use `nvm` if you juggle versions).
- **Git** — https://git-scm.com
- **Claude Code CLI** — `npm install -g @anthropic-ai/claude-code` (the whole pipeline runs inside it).
- **rclone** — `brew install rclone` (macOS) — downloads client assets from Google Drive.

And accounts / API keys (you'll paste these into `.env` below):

- **v0** — https://v0.app (design generation)
- **Supabase** — https://supabase.com (a personal access token + OAuth sign-in)
- **Vercel** *(optional)* — https://vercel.com (only for non-interactive deploys)

## Get started (one-time per clone)

**1. Clone the repo and enter it:**

```bash
git clone https://github.com/amirgholizad/starter_pack.git
cd starter_pack
```

**2. Install dependencies:**

```bash
npm install
```

**3. Configure your environment.** Copy the template and fill it in:

```bash
cp .env.example .env
```

In `.env`, set:
- `V0_API_KEY` — https://v0.app → account → API Keys
- `SUPABASE_ACCESS_TOKEN` — https://supabase.com/dashboard/account/tokens (used to create a project per client)
- `VERCEL_TOKEN` *(optional)* — https://vercel.com/account/tokens

Leave `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, and `DB_PASSWORD` blank — the `db`
phase fills them automatically per client. Then export the vars so the MCP servers pick them up:

```bash
set -a; source .env; set +a      # or use direnv
```

**4. Connect Google Drive (for client assets):**

```bash
rclone config
```

Create a **read-only Google Drive remote named `gdrive`**, authorized with the account that
owns the intake form. (Override the name later with `RCLONE_DRIVE_REMOTE` if needed.)

**5. Launch Claude Code and connect the MCP servers:**

```bash
claude
```

On first launch, **approve the MCP servers** (`shadcn`, `v0`, `supabase`). Then authenticate
the Supabase MCP once — in a real terminal, not the IDE extension:

```
/mcp        → select supabase → complete the OAuth flow
```

**6. (Optional) sanity-check the app runs:** `npm run dev`, then open http://localhost:3000.

You're set up. From here, everything happens inside Claude Code.

## Build a new website

**Prep:** drop the client's Google Form CSV export into [`intake/`](intake/README.md).

### Fastest — one command

```bash
# inside a Claude Code session:
/new-site "Business Name"
```

Runs all five phases in order, pausing at every gate above. Or use the shell launcher (runs
intake → design → build as sequential sessions, with db + deploy as opt-in prompts):

```bash
scripts/onboard.sh "Business Name"
```

## Launching agents individually

Each agent is a Claude Code subagent ([`.claude/agents/`](.claude/agents/)). Two ways to run one:

**A. As its own session** (best for the interactive phases — `design` page approvals, `deploy` preview):

```bash
claude --agent intake -p "Onboard \"Business Name\" from the CSV in intake/."   # headless
claude --agent design "Design client \"<slug>\" from its brief, one page at a time."
claude --agent build  "Build client \"<slug>\" from clients/<slug>/design/, verify npm run build."
claude --agent db     "Create the Supabase schema for \"<slug>\"; provision a project if needed."
claude --agent deploy "Deploy \"<slug>\" to Vercel: preview for approval, then production."
```

**B. From inside a running session** — just ask, and Claude dispatches the subagent:

> "Run the **build** agent for *wheel-deal-driver-training*."

The `<slug>` is the folder name under `clients/` (derived from the business name at intake).

### Per-client Supabase project (Phase 4 detail)

Each client gets its own project. If `.mcp.json`'s `project_ref` isn't already this client's,
provision one — the `db` agent does this for you, or run it directly:

```bash
python scripts/new-supabase-project.py <slug>
```

It creates the project, rewrites `project_ref` in `.mcp.json`, and fills the Supabase keys in
`.env`. The MCP only reads `project_ref` on connect, so **re-auth after the swap**:
`claude /mcp` → `supabase`.

## Repo map

- **[WORKFLOW.md](WORKFLOW.md)** — full pipeline, MCP config, stack gotchas, troubleshooting
- **[AGENTS.md](AGENTS.md)** — stack rules + operational guardrails (bounded retries, logging)
- **[clients/README.md](clients/README.md)** — client folders (gitignored; hold PII)
- **[logs/README.md](logs/README.md)** — agents log problems here (`BLOCKED` / `WORKAROUND`)
- **[.claude/agents/](.claude/agents/)** — the five agents; tune each one's model in its frontmatter (`model:`)
- **[scripts/](scripts/)** — `onboard.sh`, `new-supabase-project.py`, `fetch-drive-assets.py`, `publish-assets.py`, `snap.sh`
