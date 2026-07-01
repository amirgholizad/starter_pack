# Website build workflow

Reusable starter for client sites. Fixed stack: **Next.js · React · Tailwind · shadcn · Supabase · Vercel**. Design is generated with **v0**, then built here by Claude Code.

## Pipeline

```
client brief → v0 generates design (Next/Tailwind/shadcn) →
Claude Code builds the real app → Supabase wired in → Vercel deploy → review loop
```

v0 outputs the same stack we build in, so its code is a **reference** to refactor, not the final app (see AGENTS.md).

## Per-client intake (start here)

Each client starts from a filled brief. Drop the Google Form CSV export into the `intake/`
folder and ask Claude to **run the `intake` agent** for that client — it installs the
client-privacy `.gitignore` rules, fills `clients/<slug>/brief.md` (derived Supabase schema
+ v0 design direction), and downloads their Drive assets into `clients/<slug>/assets/`.
See `clients/README.md`. Then feed the brief to v0.

## Design with v0 (one page at a time)

Once a client's brief is filled, run the **`design` agent** for that client. It publishes
their assets to a public Supabase bucket (`scripts/publish-assets.py`), then generates each
page with the v0 MCP — feeding the real logo/photos as attachments and the brief's design
direction — pausing for your approval per page. Approved pages are saved to
`clients/<slug>/design/<page>/` (code + v0 URL) and become the reference the build is
verified against. Needs `SUPABASE_SERVICE_ROLE_KEY` in `.env` for asset publishing.

## Build the app (Phase 3)

Once the designs are approved, run the **`build` agent** for the client. It promotes
`clients/<slug>/design/` into the real Next.js app: maps each page to a route under
`src/app/`, refactors v0's reference code into reusable `src/components/`, swaps in real
**shadcn** primitives, copies assets into `public/images/`, installs any missing deps,
wires forms to Supabase, and verifies with `npm run build`. v0 output is a reference —
this is the step that turns it into a running site (don't hand-copy designs into `src/`
yourself). It **defers table creation** — the tables its forms insert into are handed off
to Phase 4 (the `db` agent) rather than blocking the build.

## Create the schema (Phase 4)

Run the **`db` agent** for the client. It reads the brief's data model (§6), functionality
(§5), and developer notes (§8) plus the build agent's table handoffs, then creates the real
Supabase schema via the Supabase MCP: tables with proper types, **row-level security on every
table** (public insert for lead/contact/comment forms, `auth.uid()`-scoped policies for
owner/admin data), a named migration (`apply_migration`), a `get_advisors` security/perf pass,
and TypeScript types written to `src/lib/supabase/types.ts`. **It targets the one project set
by `project_ref` in `.mcp.json`** — the agent confirms that ref is this client's project
before migrating, since a migration isn't reversible. Auth users can't be made in SQL, so it
documents the one-time admin-user setup where a protected/admin route is needed.

Each client gets **its own project**. Provision one (and repoint the repo at it) with:

```
python scripts/new-supabase-project.py <slug>
```

The MCP is pinned to a single project and can't create projects, so this uses the Supabase
**Management API** (needs `SUPABASE_ACCESS_TOKEN` in `.env`): it creates the project, then
rewrites `project_ref` in `.mcp.json` and fills `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` /
`SUPABASE_SERVICE_ROLE_KEY` in `.env`. The MCP only re-reads the ref on connect, so **re-auth
after the swap** (`claude /mcp` → supabase). The `db` agent runs this for you as its step 0.

## Deploy to Vercel (Phase 5)

Run the **`deploy` agent** for the client. There's no Vercel MCP, so it drives the `vercel`
CLI: it refuses to ship unless `npm run build` passes, sets the Supabase env vars on Vercel
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) for production + preview, ships a
**preview** first and pauses for your review, then promotes to **production only on explicit
approval** (`vercel --prod`). If the client owns a domain (§7) it wires the DNS records; else
it hands over the `*.vercel.app` URL. Needs `VERCEL_TOKEN` in `.env` for non-interactive runs
(or a one-time `vercel login`).

## One command for the whole pipeline

Two entry points run all five phases with the human gates (brief review, per-page design
approval, pre-production deploy) intact:

- **`/new-site "Business Name"`** — a slash command that orchestrates intake → design → build
  → db → deploy inside one Claude Code session, dispatching each phase to its subagent.
- **`scripts/onboard.sh "Business Name"`** — the shell launcher: runs intake headlessly,
  pauses for brief review, then opens the design and build agents; the db and deploy steps are
  opt-in prompts at the end (they default to "no" so you can run schema/deploy deliberately).

## One-time setup per clone

1. `cp .env.example .env` and fill in the keys.
2. Export them into the shell that launches Claude Code so the MCP servers pick them up:
   `set -a; source .env; set +a` (or use direnv).
3. `npm install`
4. Launch Claude Code and approve the MCP servers.

## MCP servers (.mcp.json)

| Server     | Purpose                                           | Auth                       |
| ---------- | ------------------------------------------------- | -------------------------- |
| `shadcn`   | Browse/install correct shadcn components & blocks | —                          |
| `v0`       | Generate / iterate UI designs from a brief        | `V0_API_KEY` (Bearer, hosted) |
| `supabase` | Create tables, run migrations, read schema        | OAuth (hosted, `claude /mcp`) |

Supabase MCP is the **hosted** server (`https://mcp.supabase.com/mcp?project_ref=...`):
- Authenticate once per machine: run `claude /mcp` in a real terminal (not the IDE
  extension), select `supabase`, and complete the OAuth flow.
- It targets one project via the `project_ref` in the `.mcp.json` URL — **swap that
  ref per client**.

v0 note:
- v0 is the **official hosted MCP** (`https://mcp.v0.dev/sse`, Streamable HTTP, Bearer auth).
  `V0_API_KEY` must be exported in the shell that launches Claude Code so `${V0_API_KEY}`
  resolves in the header. The community `v0-mcp-server` npm package was dropped — it rejects
  current `v1:...:vcp_...` keys. Docs: https://v0.app/docs/api/platform/adapters/mcp-server

## Agent logging & guardrails

Every agent follows the **Operational rules** in `AGENTS.md`: bounded retries (at most two
*materially different* fixes before escalating — no infinite loops), token/scope discipline,
and a shared problem log. When an agent gives up on a step (`BLOCKED`), works around it
(`WORKAROUND`), or hits a recurring gotcha, it appends a structured entry to
[`logs/README.md`](logs/README.md) — client referenced by slug only, no PII or secrets. Skim
that file to see what keeps breaking across runs.

## Stack notes (this is NOT standard Next.js)

Read `node_modules/next/dist/docs/` before writing code. Already-bitten gotchas baked into this template:
- `middleware.ts` is renamed to **`proxy.ts`** (exports `proxy`, not `middleware`).
- `cookies()` is **async** — always `await cookies()`.

## Supabase helpers

- `src/lib/supabase/client.ts` — browser client (Client Components).
- `src/lib/supabase/server.ts` — server client (Server Components / Route Handlers).
- `src/lib/supabase/middleware.ts` — `updateSession()` for auth refresh.
- `src/proxy.ts` — runs `updateSession()` on every request.

## Troubleshooting (from real runs)

- **`Cannot find module '../server/require-hook'` on `npm run dev`** — a corrupted/partial
  Next.js install, not a code issue. Fix: `rm -rf node_modules package-lock.json && npm install`.
- **`Module not found: framer-motion`** — `framer-motion` ships in dependencies now; if you
  still hit this, run `npm install`. v0 designs commonly import it for animations.
- **`publish-assets.py` fails with `InvalidURL` / on filenames with spaces** — fixed: asset
  filenames are sanitized to URL-safe keys before upload. Make sure your copy is current.
- **v0 acknowledges a change but the code doesn't update** — the design agent now re-fetches
  the chat's files (`getChat`) and diffs to confirm the change landed; if v0 still won't
  regenerate, it edits the saved files directly rather than trusting the chat text.
