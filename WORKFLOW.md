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
yourself). Schema creation and deploy are the next phases (Supabase, Vercel).

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
